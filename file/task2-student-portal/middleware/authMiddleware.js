const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Student = require('../models/Student');

async function authMiddleware(req, res, next) {
  const authorization = req.get('Authorization') || '';
  const match = /^Bearer\s+(\S+)$/i.exec(authorization);
  if (!match) {
    return res.status(401).json({ error: 'A Bearer token is required.' });
  }

  let claims;
  try {
    claims = jwt.verify(match[1], process.env.JWT_SECRET, { algorithms: ['HS256'] });
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }

  if (!mongoose.isObjectIdOrHexString(claims.sub)) {
    return res.status(401).json({ error: 'Invalid token subject.' });
  }

  const user = await Student.findById(claims.sub);
  if (!user) {
    return res.status(401).json({ error: 'The token account no longer exists.' });
  }

  req.user = user;
  next();
}

function adminOnly(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access is required.' });
  }
  next();
}

module.exports = { authMiddleware, adminOnly };
