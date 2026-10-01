CREATE TABLE IF NOT EXISTS mysite_tasks (
 id CHAR(32) CHARACTER SET ascii COLLATE ascii_bin PRIMARY KEY,
 destination_account_id VARCHAR(80) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 idempotency_key VARCHAR(128) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 request_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 kind VARCHAR(32) NOT NULL DEFAULT 'wechat_draft',
 status VARCHAR(32) NOT NULL DEFAULT 'queued',
 stage VARCHAR(80) NOT NULL DEFAULT 'queued',
 payload JSON NOT NULL,
 result JSON NULL,
 error_message VARCHAR(500) NOT NULL DEFAULT '',
 lease_expires_at DATETIME(6) NULL,
 created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
 UNIQUE KEY uq_task_idempotency (destination_account_id, idempotency_key),
 KEY ix_task_claim (status, created_at),
 KEY ix_task_lease (status, lease_expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS mysite_content (
 path VARCHAR(512) NOT NULL PRIMARY KEY,
 content_sha256 CHAR(64) CHARACTER SET ascii NOT NULL,
 body MEDIUMTEXT NOT NULL,
 source VARCHAR(32) NOT NULL DEFAULT 'repository_import',
 imported_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
CREATE TABLE IF NOT EXISTS mysite_media (
 destination_account_id VARCHAR(80) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 image_sha256 CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 purpose VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 status VARCHAR(32) NOT NULL DEFAULT 'reserved',
 owner_task_id CHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
 remote_id TEXT NULL,
 created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
 updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
 PRIMARY KEY (destination_account_id,image_sha256,purpose)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
