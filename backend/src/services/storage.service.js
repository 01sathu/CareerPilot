const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const AppError = require('../utils/appError');
const env = require('../config/env');

const UPLOADS_DIR = path.join(__dirname, '../../uploads/resumes');

// Ensure local upload directory exists
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

/**
 * Storage Service Adapter (Local disk driver with S3 extensibility)
 * Enforces user-isolated storage paths and short-lived signed URLs (FR-048, FR-052, NFR-MNT-02)
 */
class StorageService {
  constructor() {
    this.driver = env.STORAGE_DRIVER || 'local';
    this.s3Client = null;

    if (this.driver === 's3' && env.S3_BUCKET) {
      try {
        const { S3Client } = require('@aws-sdk/client-s3');
        this.s3Client = new S3Client({
          region: env.S3_REGION || 'us-east-1',
          endpoint: env.S3_ENDPOINT || undefined,
          credentials: env.S3_ACCESS_KEY_ID
            ? {
                accessKeyId: env.S3_ACCESS_KEY_ID,
                secretAccessKey: env.S3_SECRET_ACCESS_KEY
              }
            : undefined
        });
      } catch (err) {
        console.warn('[Storage] @aws-sdk/client-s3 not installed or failed to initialize. Falling back to local disk driver.');
        this.driver = 'local';
      }
    }
  }

  /**
   * Save PDF buffer to storage under user-isolated random key
   * @param {string} userId - Owner's user ID
   * @param {Buffer} buffer - File buffer
   * @returns {Promise<string>} storageKey
   */
  async uploadResume(userId, buffer) {
    const randomKey = crypto.randomUUID();
    const storageKey = `${userId}/${randomKey}.pdf`;

    if (this.driver === 's3' && this.s3Client) {
      const { PutObjectCommand } = require('@aws-sdk/client-s3');
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: env.S3_BUCKET,
          Key: storageKey,
          Body: buffer,
          ContentType: 'application/pdf'
        })
      );
      return storageKey;
    }

    const userDir = path.join(UPLOADS_DIR, userId);
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }

    const filePath = path.join(UPLOADS_DIR, storageKey);
    await fs.promises.writeFile(filePath, buffer);

    return storageKey;
  }

  /**
   * Read resume file buffer from storage
   * @param {string} storageKey - File storage key
   * @returns {Promise<Buffer>}
   */
  async getFileBuffer(storageKey) {
    if (this.driver === 's3' && this.s3Client) {
      const { GetObjectCommand } = require('@aws-sdk/client-s3');
      try {
        const response = await this.s3Client.send(
          new GetObjectCommand({
            Bucket: env.S3_BUCKET,
            Key: storageKey
          })
        );
        const byteArray = await response.Body.transformToByteArray();
        return Buffer.from(byteArray);
      } catch (err) {
        throw new AppError('Resume file not found in storage', 404, 'FILE_NOT_FOUND');
      }
    }

    const filePath = path.join(UPLOADS_DIR, storageKey);
    if (!fs.existsSync(filePath)) {
      throw new AppError('Resume file not found in storage', 404, 'FILE_NOT_FOUND');
    }
    return fs.promises.readFile(filePath);
  }

  /**
   * Delete resume file from storage (FR-053, FR-122)
   * @param {string} storageKey
   */
  async deleteFile(storageKey) {
    if (!storageKey) return;

    if (this.driver === 's3' && this.s3Client) {
      const { DeleteObjectCommand } = require('@aws-sdk/client-s3');
      try {
        await this.s3Client.send(
          new DeleteObjectCommand({
            Bucket: env.S3_BUCKET,
            Key: storageKey
          })
        );
      } catch (err) {
        console.error(`[Storage] Failed to delete S3 file ${storageKey}:`, err.message);
      }
      return;
    }

    const filePath = path.join(UPLOADS_DIR, storageKey);
    if (fs.existsSync(filePath)) {
      try {
        await fs.promises.unlink(filePath);
      } catch (err) {
        console.error(`[Storage] Failed to delete file ${storageKey}:`, err.message);
      }
    }
  }

  /**
   * Delete entire user storage directory (FR-121, FR-122)
   * @param {string} userId
   */
  async deleteUserDirectory(userId) {
    if (!userId) return;
    const userDir = path.join(UPLOADS_DIR, String(userId));
    if (fs.existsSync(userDir)) {
      try {
        await fs.promises.rm(userDir, { recursive: true, force: true });
      } catch (err) {
        console.error(`[Storage] Failed to delete user directory ${userId}:`, err.message);
      }
    }
  }

  /**
   * Generate 5-minute signed token for secure download (FR-052)
   * @param {string} userId
   * @param {string} storageKey
   * @param {string} resumeId
   * @returns {string} Signed download URL or query token
   */
  generateSignedDownloadToken(userId, storageKey, resumeId) {
    const secret = env.JWT_ACCESS_SECRET || 'careerpilot_default_secret_key_2026';
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes (FR-052)

    const payload = `${userId}:${storageKey}:${expiresAt}`;
    const signature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    return {
      token: `${expiresAt}.${signature}`,
      expiresAt: new Date(expiresAt)
    };
  }

  /**
   * Verify signed download token
   * @param {string} userId
   * @param {string} storageKey
   * @param {string} tokenString - formatted as `${expiresAt}.${signature}`
   * @returns {boolean}
   */
  verifySignedDownloadToken(userId, storageKey, tokenString) {
    if (!tokenString || !tokenString.includes('.')) return false;

    const [expiresAtStr, signature] = tokenString.split('.');
    const expiresAt = parseInt(expiresAtStr, 10);

    if (isNaN(expiresAt) || Date.now() > expiresAt) {
      return false; // Expired (FR-052)
    }

    const secret = env.JWT_ACCESS_SECRET || 'careerpilot_default_secret_key_2026';
    const expectedPayload = `${userId}:${storageKey}:${expiresAt}`;
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(expectedPayload)
      .digest('hex');

    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex')
    );
  }
}

module.exports = new StorageService();
