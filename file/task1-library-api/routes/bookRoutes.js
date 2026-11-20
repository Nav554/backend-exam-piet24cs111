const express = require('express');
const mongoose = require('mongoose');
const Book = require('../models/Book');

const router = express.Router();

const fieldTypes = new Map([
  ['title', 'string'],
  ['author', 'string'],
  ['price', 'number'],
  ['category', 'string'],
  ['isAvailable', 'boolean']
]);

function validateBookInput(req, res, next) {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return res.status(400).json({ error: 'Send a JSON object containing book fields.' });
  }

  const fields = Object.entries(req.body);
  if (fields.length === 0) {
    return res.status(400).json({ error: 'Provide at least one book field.' });
  }

  for (const [name, value] of fields) {
    const expectedType = fieldTypes.get(name);
    if (!expectedType) {
      return res.status(400).json({ error: 'Unknown book field: ' + name });
    }
    if (typeof value !== expectedType || (name === 'price' && !Number.isFinite(value))) {
      return res.status(400).json({ error: name + ' must be a ' + expectedType + '.' });
    }
  }

  next();
}

function bookNotFound(res) {
  return res.status(404).json({ error: 'Book not found.' });
}

router.param('id', (req, res, next, id) => {
  if (!mongoose.isObjectIdOrHexString(id)) {
    return res.status(400).json({ error: 'Invalid book ID. Use a 24-character hexadecimal ObjectId.' });
  }
  next();
});

router.post('/', validateBookInput, async (req, res) => {
  const book = await Book.create(req.body);
  res.status(201).json(book);
});

router.get('/', async (req, res) => {
  const books = await Book.find().sort({ _id: 1 });
  res.status(200).json(books);
});

router.get('/:id', async (req, res) => {
  const book = await Book.findById(req.params.id);
  if (!book) return bookNotFound(res);
  res.status(200).json(book);
});

router.put('/:id', validateBookInput, async (req, res) => {
  const book = await Book.findByIdAndUpdate(
    req.params.id,
    { $set: req.body },
    { returnDocument: 'after', runValidators: true }
  );
  if (!book) return bookNotFound(res);
  res.status(200).json(book);
});

router.delete('/:id', async (req, res) => {
  const book = await Book.findByIdAndDelete(req.params.id);
  if (!book) return bookNotFound(res);
  res.status(200).json({ message: 'Book deleted.', book });
});

module.exports = router;
