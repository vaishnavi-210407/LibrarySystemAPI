
const mongoose = require('mongoose');

const CpyModel = require('../../models/bookCopies/bookCopies');
const bookModel = require('../../models/books/bookModel');
const borrowingModel = require('../../models/borrowings/borrowingModel');

const isValidId = (id) => mongoose.isValidObjectId(id);


// CREATE BOOK COPY
const bookCopyCreateController = async (req, res) => {
    try {
        let { bookId, copyNumber } = req.body;

        if (
            typeof bookId !== 'string' ||
            !bookId.trim() ||
            typeof copyNumber !== 'string' ||
            !copyNumber.trim()
        ) {
            return res.status(400).json({
                message: 'bookId and copyNumber are required.',
                data: null
            });
        }

        bookId = bookId.trim();
        copyNumber = copyNumber.trim();

        if (!isValidId(bookId)) {
            return res.status(400).json({
                message: 'Invalid bookId.',
                data: null
            });
        }

        const book = await bookModel.findById(bookId);

        if (!book) {
            return res.status(404).json({
                message: 'Book not found.',
                data: null
            });
        }

        const existingCopy = await CpyModel.findOne({ copyNumber });

        if (existingCopy) {
            return res.status(409).json({
                message: 'This copyNumber already exists.',
                data: null
            });
        }

        const bookCopy = await CpyModel.create({
            bookId,
            copyNumber
        });

        return res.status(201).json({
            message: 'Book copy created successfully.',
            data: bookCopy
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                message: 'This copyNumber already exists.',
                data: null
            });
        }

        if (error.name === 'ValidationError') {
            return res.status(400).json({
                message: 'Invalid book copy data.',
                data: null
            });
        }

        return res.status(500).json({
            message: 'Server side error.',
            data: null
        });
    }
};


// FETCH ALL BOOK COPIES
const bookCopyfetchAllController = async (req, res) => {
    try {
        const bookCopies = await CpyModel.find()
            .populate('bookId');

        return res.status(200).json({
            message: 'All book copies fetched successfully.',
            data: bookCopies
        });
    } catch (error) {
        return res.status(500).json({
            message: 'Server side error.',
            data: null
        });
    }
};


// FETCH SINGLE BOOK COPY
const bookCopysingleFetchController = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidId(id)) {
            return res.status(400).json({
                message: 'Invalid book copy ID.',
                data: null
            });
        }

        const bookCopy = await CpyModel.findById(id)
            .populate('bookId');

        if (!bookCopy) {
            return res.status(404).json({
                message: 'Book copy not found.',
                data: null
            });
        }

        return res.status(200).json({
            message: 'Book copy fetched successfully.',
            data: bookCopy
        });
    } catch (error) {
        return res.status(500).json({
            message: 'Server side error.',
            data: null
        });
    }
};


// UPDATE BOOK COPY
const bookCopyupdateController = async (req, res) => {
    try {
        const { id } = req.params;
        const { bookId, copyNumber } = req.body;

        if (!isValidId(id)) {
            return res.status(400).json({
                message: 'Invalid book copy ID.',
                data: null
            });
        }

        if (bookId === undefined && copyNumber === undefined) {
            return res.status(400).json({
                message: 'Provide bookId or copyNumber to update.',
                data: null
            });
        }

        const bookCopy = await CpyModel.findById(id);

        if (!bookCopy) {
            return res.status(404).json({
                message: 'Book copy not found.',
                data: null
            });
        }

        const hasHistory = await borrowingModel.exists({
            copyId: bookCopy._id
        });

        if (hasHistory && bookId !== undefined) {
            return res.status(409).json({
                message: 'Cannot change the book linked to a copy with borrowing history.',
                data: null
            });
        }

        const updateData = {};

        if (bookId !== undefined) {
            if (
                typeof bookId !== 'string' ||
                !isValidId(bookId.trim())
            ) {
                return res.status(400).json({
                    message: 'Invalid bookId.',
                    data: null
                });
            }

            const book = await bookModel.findById(bookId.trim());

            if (!book) {
                return res.status(404).json({
                    message: 'Book not found.',
                    data: null
                });
            }

            updateData.bookId = book._id;
        }

        if (copyNumber !== undefined) {
            if (
                typeof copyNumber !== 'string' ||
                !copyNumber.trim()
            ) {
                return res.status(400).json({
                    message: 'copyNumber must be a non-empty string.',
                    data: null
                });
            }

            updateData.copyNumber = copyNumber.trim();
        }

        const updatedCopy = await CpyModel.findByIdAndUpdate(
            id,
            { $set: updateData },
            {
                new: true,
                runValidators: true
            }
        ).populate('bookId');

        return res.status(200).json({
            message: 'Book copy updated successfully.',
            data: updatedCopy
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                message: 'This copyNumber already exists.',
                data: null
            });
        }

        if (
            error.name === 'ValidationError' ||
            error.name === 'CastError'
        ) {
            return res.status(400).json({
                message: 'Invalid book copy data.',
                data: null
            });
        }

        return res.status(500).json({
            message: 'Server side error.',
            data: null
        });
    }
};


// DELETE BOOK COPY
const bookCopydeleteController = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidId(id)) {
            return res.status(400).json({
                message: 'Invalid book copy ID.',
                data: null
            });
        }

        const bookCopy = await CpyModel.findById(id);

        if (!bookCopy) {
            return res.status(404).json({
                message: 'Book copy not found.',
                data: null
            });
        }

        const hasHistory = await borrowingModel.exists({
            copyId: bookCopy._id
        });

        if (hasHistory) {
            return res.status(409).json({
                message: 'Cannot delete a copy with borrowing history.',
                data: null
            });
        }

        await CpyModel.findByIdAndDelete(id);

        return res.status(200).json({
            message: 'Book copy deleted successfully.',
            data: bookCopy
        });
    } catch (error) {
        return res.status(500).json({
            message: 'Server side error.',
            data: null
        });
    }
};


module.exports = {
    bookCopyCreateController,
    bookCopyfetchAllController,
    bookCopysingleFetchController,
    bookCopyupdateController,
    bookCopydeleteController
};
