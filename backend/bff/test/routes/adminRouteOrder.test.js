const fs = require('fs');
const path = require('path');

describe('admin route order', () => {
  it('uses shared upload limits for admin upload endpoints', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '../../src/routes/admin.js'),
      'utf8'
    );

    expect(source).toContain("const config = require('../config');");
    expect(source).toContain('fileSize: config.uploads.fileSizeBytes');
    expect(source).toContain('fieldSize: config.uploads.fieldSizeBytes');
    expect(source).toContain('files: config.uploads.files');
  });

  it('registers static export routes before dynamic user and rider detail routes', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '../../src/routes/admin.js'),
      'utf8'
    );

    expect(source.indexOf("router.get('/users/export', adminDataController.exportData);"))
      .toBeGreaterThan(-1);
    expect(source.indexOf("router.get('/users/:id', adminDataController.getUserById);"))
      .toBeGreaterThan(-1);
    expect(source.indexOf("router.get('/riders/export', adminDataController.exportData);"))
      .toBeGreaterThan(-1);
    expect(source.indexOf("router.get('/riders/:id', adminDataController.getRiderById);"))
      .toBeGreaterThan(-1);

    expect(
      source.indexOf("router.get('/users/export', adminDataController.exportData);")
    ).toBeLessThan(
      source.indexOf("router.get('/users/:id', adminDataController.getUserById);")
    );

    expect(
      source.indexOf("router.get('/riders/export', adminDataController.exportData);")
    ).toBeLessThan(
      source.indexOf("router.get('/riders/:id', adminDataController.getRiderById);")
    );
  });
});
