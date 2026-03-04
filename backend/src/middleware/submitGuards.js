const inFlightSubmissions = new Set();
const recentFingerprints = new Map();
const rateLimitBuckets = new Map();

const DUPLICATE_WINDOW_MS = 4000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 8;

function now() {
  return Date.now();
}

function cleanupMaps() {
  const current = now();

  for (const [fingerprint, timestamp] of recentFingerprints.entries()) {
    if (current - timestamp > DUPLICATE_WINDOW_MS) {
      recentFingerprints.delete(fingerprint);
    }
  }

  for (const [key, bucket] of rateLimitBuckets.entries()) {
    if (current - bucket.startedAt > RATE_LIMIT_WINDOW_MS) {
      rateLimitBuckets.delete(key);
    }
  }
}

function getSubmissionKey(req) {
  const userId = req.user?._id?.toString() || req.ip;
  const challengeId = req.params?.challengeId || 'unknown';
  return `${userId}:${challengeId}`;
}

function getFingerprint(req) {
  const flag = String(req.body?.flag || '').trim();
  return `${getSubmissionKey(req)}:${flag}`;
}

function submissionRateLimit(req, res, next) {
  cleanupMaps();

  const key = req.user?._id?.toString() || req.ip;
  const current = now();
  const bucket = rateLimitBuckets.get(key);

  if (!bucket || current - bucket.startedAt > RATE_LIMIT_WINDOW_MS) {
    rateLimitBuckets.set(key, {
      startedAt: current,
      count: 1
    });
    return next();
  }

  if (bucket.count >= RATE_LIMIT_MAX) {
    return res.status(429).json({
      message: 'Too many flag submissions. Please wait a moment before trying again.'
    });
  }

  bucket.count += 1;
  return next();
}

function preventDuplicateSubmit(req, res, next) {
  cleanupMaps();

  const submissionKey = getSubmissionKey(req);
  const fingerprint = getFingerprint(req);

  if (inFlightSubmissions.has(submissionKey)) {
    return res.status(429).json({
      message: 'A submission for this challenge is already being processed.'
    });
  }

  const lastFingerprintAt = recentFingerprints.get(fingerprint);

  if (lastFingerprintAt && now() - lastFingerprintAt < DUPLICATE_WINDOW_MS) {
    return res.status(429).json({
      message: 'Duplicate submission detected. Please avoid double-clicking submit.'
    });
  }

  inFlightSubmissions.add(submissionKey);
  recentFingerprints.set(fingerprint, now());

  const release = () => {
    inFlightSubmissions.delete(submissionKey);
    res.removeListener('finish', release);
    res.removeListener('close', release);
  };

  res.on('finish', release);
  res.on('close', release);

  return next();
}

module.exports = {
  submissionRateLimit,
  preventDuplicateSubmit
};
