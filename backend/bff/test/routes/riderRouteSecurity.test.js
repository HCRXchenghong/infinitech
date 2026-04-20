const fs = require('fs');
const path = require('path');

describe('rider route upload security', () => {
  it('authenticates rider cert uploads before multer persists files', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '../../src/routes/rider.js'),
      'utf8'
    );

    expect(source).toContain("const config = require('../config')");
    expect(source).toContain("const { requireRequestAuth } = require('../middleware/requireRequestAuth')");
    expect(source).toContain('fileSize: config.uploads.fileSizeBytes');
    expect(source).toContain('fieldSize: config.uploads.fieldSizeBytes');
    expect(source).toContain('files: config.uploads.files');
    expect(source).toContain("router.post('/:riderId/cert', requireRequestAuth, upload.single('image'), riderController.uploadCert)");

    expect(
      source.indexOf("router.post('/:riderId/cert', requireRequestAuth, upload.single('image'), riderController.uploadCert)")
    ).toBeGreaterThan(-1);
  });
});
