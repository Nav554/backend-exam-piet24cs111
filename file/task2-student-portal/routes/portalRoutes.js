const { timingSafeEqual } = require('node:crypto');
const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const Student = require('../models/Student');
const { authMiddleware, adminOnly } = require('../middleware/authMiddleware');

const router = express.Router();

const emailRule = body('email')
  .isString().bail().trim().isEmail().withMessage('Use a valid email address.').bail()
  .customSanitizer(email => email.toLowerCase());

const passwordRule = body('password')
  .isString().bail()
  .isLength({ min: 6 }).withMessage('Password must contain at least 6 characters.').bail()
  .isByteLength({ max: 72 }).withMessage('Password must occupy at most 72 bytes.');

function validateRequest(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      errors: errors.array({ onlyFirstError: true }).map(({ path, msg }) => ({
        field: path,
        message: msg
      }))
    });
  }
  next();
}

function canRegisterAdmin(req) {
  const expectedKey = process.env.ADMIN_REGISTRATION_KEY;
  if (!expectedKey) return false;

  const expected = Buffer.from(expectedKey);
  const supplied = Buffer.from(req.get('X-Admin-Registration-Key') || '');
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}

router.post('/register', [
  body('name').isString().bail().trim().notEmpty().withMessage('Name is required.'),
  emailRule,
  passwordRule,
  body('role').optional().isString().bail().isIn(['student', 'admin'])
    .withMessage('Role must be student or admin.')
], validateRequest, async (req, res) => {
  const { name, email, password, role = 'student' } = req.body;
  if (role === 'admin' && !canRegisterAdmin(req)) {
    return res.status(403).json({ error: 'Admin registration requires a valid registration key.' });
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await Student.create({ name, email, password: passwordHash, role });
  res.status(201).json({ _id: user.id, name: user.name, email: user.email, role: user.role });
});

router.post('/login', [emailRule, passwordRule], validateRequest, async (req, res) => {
  const { email, password } = req.body;
  const user = await Student.findOne({ email }).select('+password');

  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).json({ error: 'Incorrect email or password.' });
  }

  const token = jwt.sign({}, process.env.JWT_SECRET, {
    subject: user.id,
    algorithm: 'HS256',
    expiresIn: '1h'
  });
  res.status(200).json({ token });
});

router.get('/profile', authMiddleware, (req, res) => {
  res.status(200).json(req.user);
});

router.get('/students', authMiddleware, adminOnly, async (req, res) => {
  const students = await Student.find({ role: 'student' }).sort({ _id: 1 });
  res.status(200).json(students);
});

module.exports = router;
