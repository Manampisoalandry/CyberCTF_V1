const fs = require('fs');

function safeUnlink(filePath) {
  if (!filePath) return false;

  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
  } catch (error) {
    console.warn(`Failed to delete file on disk: ${filePath}`, error.message);
  }

  return false;
}

function deleteUploadedRequestFiles(files = []) {
  if (!Array.isArray(files) || !files.length) {
    return { deleted: 0, missing: 0 };
  }

  let deleted = 0;
  let missing = 0;

  for (const file of files) {
    const removed = safeUnlink(file?.path);
    if (removed) deleted += 1;
    else missing += 1;
  }

  return { deleted, missing };
}

function deleteChallengeFiles(challenge) {
  if (!challenge?.files?.length) {
    return { deleted: 0, missing: 0 };
  }

  let deleted = 0;
  let missing = 0;

  for (const file of challenge.files) {
    const removed = safeUnlink(file.pathOnDisk);
    if (removed) deleted += 1;
    else missing += 1;
  }

  return { deleted, missing };
}

module.exports = {
  safeUnlink,
  deleteUploadedRequestFiles,
  deleteChallengeFiles
};
