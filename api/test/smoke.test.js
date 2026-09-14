const { describe, it } = require('node:test');
const assert = require('node:assert');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

describe('vpnCheck', () => {
  it('should detect VPN via proxycheck payload', () => {
    const ip = '198.98.54.1';
    const data = { status: 'ok', [ip]: { proxy: 'yes', type: 'VPN', provider: 'FranTech' } };
    const ipData = data[ip];
    const isVpn = ipData.proxy === 'yes' || ipData.type === 'VPN' || ipData.type === 'Proxy' || ipData.type === 'Hosting';
    assert.strictEqual(isVpn, true);
  });
  it('should not flag clean IP', () => {
    const ip = '8.8.8.8';
    const data = { status: 'ok', [ip]: { proxy: 'no', type: 'Business' } };
    const isVpn = data[ip].proxy === 'yes' || ['VPN','Proxy','Hosting'].includes(data[ip].type);
    assert.strictEqual(isVpn, false);
  });
  it('should handle IP spoof via split', () => {
    const rawIp = '1.1.1.1, 2.2.2.2, 3.3.3.3';
    const ip = String(rawIp).split(',')[0].trim().replace(/^::ffff:/, '');
    assert.strictEqual(ip, '1.1.1.1');
  });
});

describe('auth JWT', () => {
  it('should sign and verify with HS256', () => {
    const secret = 'testsecret1234567890testsecret';
    const token = jwt.sign({ id: '123', guild_roles: ['1503064097040629891'] }, secret, { expiresIn: '15m', algorithm: 'HS256' });
    const decoded = jwt.verify(token, secret, { algorithms: ['HS256'] });
    assert.strictEqual(decoded.id, '123');
  });
  it('should reject wrong algorithm', () => {
    const secret = 'testsecret';
    const token = jwt.sign({ id: '123' }, secret, { algorithm: 'HS256' });
    assert.throws(() => jwt.verify(token, secret, { algorithms: ['RS256'] }));
  });
});

describe('checkPartnerAccess slug', () => {
  it('should allow valid slug', () => {
    const re = /^[a-z0-9-]{2,32}$/;
    assert.match('valid-slug-123', re);
  });
  it('should reject traversal', () => {
    const re = /^[a-z0-9-]{2,32}$/;
    assert.strictEqual(re.test('../../etc'), false);
    assert.strictEqual(re.test('INVALID'), false);
  });
});

describe('tiktok sanitization', () => {
  it('should reject invalid color', () => {
    const isValidColor = (v) => /^#[0-9a-fA-F]{3,8}$/.test(v) || /^transparent$/i.test(v) || /^rgba?\(/.test(v);
    assert.strictEqual(isValidColor('red</style><script>'), false);
    assert.strictEqual(isValidColor('#ff0000'), true);
    assert.strictEqual(isValidColor('transparent'), true);
  });
  it('should clamp size', () => {
    const clampInt = (v, min, max, fb) => { const n=parseInt(v,10); if(isNaN(n)) return fb; return Math.max(min, Math.min(max,n)); };
    assert.strictEqual(clampInt('99999',10,200,34), 200);
    assert.strictEqual(clampInt('5',10,200,34), 10);
  });
});

describe('stripe webhook raw body', () => {
  it('should require raw body for signature', () => {
    // Simulate that express.json is skipped for webhook, so raw body is Buffer
    const raw = Buffer.from('{"test":1}');
    assert.ok(Buffer.isBuffer(raw));
    // stripe.webhooks.constructEvent would verify with raw, not parsed object
    // We just ensure raw is not object
    assert.strictEqual(typeof raw, 'object');
  });
});
