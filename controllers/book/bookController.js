
const mongoose = require('mongoose');

const bookModel = require('../../models/books/bookModel');
const bookCopyModel = require('../../models/bookCopies/bookCopies');
const categoryModel = require('../../models/category/categoryModel');

const isValidId = (id) => mongoose.isValidObjectId(id);

const textFields = [
    'name',
    'description',
    'author',
    'ISBN',
    'publisher',
    'language'
];

const escapeRegex = (value) =>
    value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const validateBookFields = (data) => {
    for (const field of textFields) {
        if (
            typeof data[field] !== 'string' ||
            !data[field].trim()
        ) {
            return `${field} must be a non-empty string.`;
        }
    }

    const year = Number(data.publicationYear);

    if (
        data.publicationYear === undefined ||
        data.publicationYear === null ||
        data.publicationYear === '' ||
        !Number.isInteger(year) ||
        year < 1 ||
        year > new Date().getFullYear()
    ) {
        return 'Please provide a valid publicationYear.';
    }

    return null;
};


// CREATE BOOK
const bookCreateController = async (req, res) => {
    try {
        const {
            categoryId,
            name,
            description,
            author,
            ISBN,
            publisher,
            language,
            publicationYear
        } = req.body;

        if (!isValidId(categoryId)) {
            return res.status(400).json({
                message: 'Please provide a valid categoryId.',
                data: null
            });
        }

        const validationError = validateBookFields({
            name,
            description,
            author,
            ISBN,
            publisher,
            language,
            publicationYear
        });

        if (validationError) {
            return res.status(400).json({
                message: validationError,
                data: null
            });
        }

        const category = await categoryModel.findOne({
            _id: categoryId,
            status: 'active'
        });

        if (!category) {
            return res.status(400).json({
                message: 'Category not found or inactive.',
                data: null
            });
        }

        const existingISBN = await bookModel.findOne({
            ISBN: ISBN.trim()
        });

        if (existingISBN) {
            return res.status(409).json({
                message: 'A book with this ISBN already exists.',
                data: null
            });
        }

        
        const bookData = {
            categoryId,
            name,
            description,
            author,
            ISBN,
            publisher,
            language,
            publicationYear: Number(publicationYear),
            image: req.file ? `/uploads/${req.file.filename}` : null
        };

        const book = await bookModel.create(bookData);


        return res.status(201).json({
            message: 'Book created successfully.',
            data: book
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                message: 'A book with this ISBN already exists.',
                data: null
            });
        }

        if (error.name === 'ValidationError' || error.name === 'CastError') {
            return res.status(400).json({
                message: 'Invalid book data.',
                data: null
            });
        }

        return res.status(500).json({
            message: 'Server side error.',
            data: null
        });
    }
};


// FETCH ALL BOOKS + SEARCH + FILTER
const allBookFetchController = async (req, res) => {
    try {
        // GET filters are read from req.query, not req.body.
        const { search, author, category, availability } = req.query;

        const query = {};

        if (search !== undefined && search.trim()) {
            query.name = {
                $regex: escapeRegex(search.trim()),
                $options: 'i'
            };
        }

        if (author !== undefined && author.trim()) {
            query.author = {
                $regex: escapeRegex(author.trim()),
                $options: 'i'
            };
        }

        if (category !== undefined && category.trim()) {
            let categoryData = null;

            if (isValidId(category)) {
                categoryData = await categoryModel.findById(category);
            } else {
                categoryData = await categoryModel.findOne({
                    name: {
                        $regex: `^${escapeRegex(category.trim())}$`,
                        $options: 'i'
                    }
                });
            }

            if (!categoryData) {
                return res.status(200).json({
                    message: 'No books found for this category.',
                    data: []
                });
            }

            query.categoryId = categoryData._id;
        }

        if (
            availability !== undefined &&
            !['available', 'unavailable'].includes(availability)
        ) {
            return res.status(400).json({
                message: 'availability must be available or unavailable.',
                data: null
            });
        }

        if (availability) {
            const copies = await bookCopyModel.find({
                status: availability
            }).select('bookId');

            const bookIds = [
                ...new Set(copies.map(copy => String(copy.bookId)))
            ];

            query._id = { $in: bookIds };
        }

        const books = await bookModel.find(query)
            .populate('categoryId')
            .sort({ createdAt: -1 });

        const result = await Promise.all(
            books.map(async (book) => {
                const [totalCopies, availableCopies, unavailableCopies] =
                    await Promise.all([
                        bookCopyModel.countDocuments({ bookId: book._id }),
                        bookCopyModel.countDocuments({
                            bookId: book._id,
                            status: 'available'
                        }),
                        bookCopyModel.countDocuments({
                            bookId: book._id,
                            status: 'unavailable'
                        })
                    ]);

                return {
                    ...book.toObject(),
                    totalCopies,
                    availableCopies,
                    unavailableCopies
                };
            })
        );

        return res.status(200).json({
            message: 'Books fetched successfully.',
            data: result
        });
    } catch (error) {
        return res.status(500).json({
            message: 'Server side error.',
            data: null
        });
    }
};


// FETCH SINGLE BOOK
const singleBookFetchController = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidId(id)) {
            return res.status(400).json({
                message: 'Invalid book ID.',
                data: null
            });
        }

        const book = await bookModel.findById(id)
            .populate('categoryId');

        if (!book) {
            return res.status(404).json({
                message: 'Book not found.',
                data: null
            });
        }

        const [totalCopies, availableCopies, unavailableCopies] =
            await Promise.all([
                bookCopyModel.countDocuments({ bookId: book._id }),
                bookCopyModel.countDocuments({
                    bookId: book._id,
                    status: 'available'
                }),
                bookCopyModel.countDocuments({
                    bookId: book._id,
                    status: 'unavailable'
                })
            ]);

        return res.status(200).json({
            message: 'Book fetched successfully.',
            data: {
                book,
                totalCopies,
                availableCopies,
                unavailableCopies
            }
        });
    } catch (error) {
        return res.status(500).json({
            message: 'Server side error.',
            data: null
        });
    }
};


// UPDATE BOOK
const bookUpdateController = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidId(id)) {
            return res.status(400).json({
                message: 'Invalid book ID.',
                data: null
            });
        }

        const existingBook = await bookModel.findById(id);

        if (!existingBook) {
            return res.status(404).json({
                message: 'Book not found.',
                data: null
            });
        }

        const allowedFields = [
            'categoryId',
            'name',
            'description',
            'author',
            'ISBN',
            'publisher',
            'language',
            'publicationYear'
        ];

        const updateData = {};

        for (const field of allowedFields) {
            if (req.body[field] !== undefined) {
                updateData[field] = req.body[field];
            }
        }

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({
                message: 'Provide at least one field to update.',
                data: null
            });
        }

        for (const field of textFields) {
            if (updateData[field] !== undefined) {
                if (
                    typeof updateData[field] !== 'string' ||
                    !updateData[field].trim()
                ) {
                    return res.status(400).json({
                        message: `${field} must be a non-empty string.`,
                        data: null
                    });
                }

                updateData[field] = updateData[field].trim();
            }
        }

        if (updateData.categoryId !== undefined) {
            if (!isValidId(updateData.categoryId)) {
                return res.status(400).json({
                    message: 'Invalid categoryId.',
                    data: null
                });
            }

            const category = await categoryModel.findOne({
                _id: updateData.categoryId,
                status: 'active'
            });

            if (!category) {
                return res.status(400).json({
                    message: 'Category not found or inactive.',
                    data: null
                });
            }
        }

        if (updateData.publicationYear !== undefined) {
            const year = Number(updateData.publicationYear);

            if (
                updateData.publicationYear === '' ||
                !Number.isInteger(year) ||
                year < 1 ||
                year > new Date().getFullYear()
            ) {
                return res.status(400).json({
                    message: 'Please provide a valid publicationYear.',
                    data: null
                });
            }

            updateData.publicationYear = year;
        }

        if (updateData.ISBN !== undefined) {
            const duplicateISBN = await bookModel.findOne({
                ISBN: updateData.ISBN,
                _id: { $ne: existingBook._id }
            });

            if (duplicateISBN) {
                return res.status(409).json({
                    message: 'A book with this ISBN already exists.',
                    data: null
                });
            }
        }

        const updatedBook = await bookModel.findByIdAndUpdate(
            id,
            { $set: updateData },
            {
                new: true,
                runValidators: true
            }
        ).populate('categoryId');

        return res.status(200).json({
            message: 'Book updated successfully.',
            data: updatedBook
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                message: 'A book with this ISBN already exists.',
                data: null
            });
        }

        if (error.name === 'ValidationError' || error.name === 'CastError') {
            return res.status(400).json({
                message: 'Invalid book data.',
                data: null
            });
        }

        return res.status(500).json({
            message: 'Server side error.',
            data: null
        });
    }
};


// DELETE BOOK
const bookDeleteController = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidId(id)) {
            return res.status(400).json({
                message: 'Invalid book ID.',
                data: null
            });
        }

        const book = await bookModel.findById(id);

        if (!book) {
            return res.status(404).json({
                message: 'Book not found.',
                data: null
            });
        }

        const hasCopies = await bookCopyModel.exists({
            bookId: book._id
        });

        if (hasCopies) {
            return res.status(409).json({
                message: 'Cannot delete this book because book copies are linked to it.',
                data: null
            });
        }

        await bookModel.findByIdAndDelete(id);

        return res.status(200).json({
            message: 'Book deleted successfully.',
            data: book
        });
    } catch (error) {
        return res.status(500).json({
            message: 'Server side error.',
            data: null
        });
    }
};


/* =========================
   SEARCH BOOKS
========================= */
const searchBookController = async (req, res) => {
    try {
        const { search } = req.query;

        if (typeof search !== 'string' || !search.trim()) {
            return res.status(400).json({
                message: 'Please provide a search value.',
                data: null
            });
        }

        const searchValue = escapeRegex(search.trim());

        const books = await bookModel.find({
            $or: [
                { name: { $regex: searchValue, $options: 'i' } },
                { author: { $regex: searchValue, $options: 'i' } }
            ]
        }).populate('categoryId');

        return res.status(200).json({
            message: 'Book search completed successfully.',
            data: books
        });
    } catch (error) {
        return res.status(500).json({
            message: 'Server side error.',
            data: null
        });
    }
};


/* =========================
   FILTER BOOKS
========================= */
const filterBookController = async (req, res) => {
    try {
        const { category, availability } = req.query;
        const query = {};

        if (
            category !== undefined &&
            (typeof category !== 'string' || !category.trim())
        ) {
            return res.status(400).json({
                message: 'Invalid category value.',
                data: null
            });
        }

        if (
            availability !== undefined &&
            !['available', 'unavailable'].includes(availability)
        ) {
            return res.status(400).json({
                message: 'Availability must be available or unavailable.',
                data: null
            });
        }

        // Filter by category ID or category name
        if (category !== undefined) {
            let categoryData;

            if (isValidId(category.trim())) {
                categoryData = await categoryModel.findById(category.trim());
            } else {
                categoryData = await categoryModel.findOne({
                    name: {
                        $regex: `^${escapeRegex(category.trim())}$`,
                        $options: 'i'
                    }
                });
            }

            if (!categoryData) {
                return res.status(200).json({
                    message: 'No books found for this category.',
                    data: []
                });
            }

            query.categoryId = categoryData._id;
        }

        // Filter by physical-copy availability
        if (availability === 'available') {
            const availableBookIds = await bookCopyModel.distinct(
                'bookId',
                { status: 'available' }
            );

            query._id = { $in: availableBookIds };
        } else if (availability === 'unavailable') {
            // Books with no available copies
            const availableBookIds = await bookCopyModel.distinct(
                'bookId',
                { status: 'available' }
            );

            query._id = { $nin: availableBookIds };
        }

        const books = await bookModel.find(query)
            .populate('categoryId');

        return res.status(200).json({
            message: 'Books filtered successfully.',
            data: books
        });
    } catch (error) {
        return res.status(500).json({
            message: 'Server side error.',
            data: null
        });
    }
};


/* =========================
   SORT BOOKS
========================= */
const sortBookController = async (req, res) => {
    try {
        const {
            sortBy = 'createdAt',
            order = 'desc'
        } = req.query;

        const allowedFields = [
            'name',
            'author',
            'publicationYear',
            'createdAt'
        ];

        if (
            typeof sortBy !== 'string' ||
            !allowedFields.includes(sortBy) ||
            typeof order !== 'string' ||
            !['asc', 'desc'].includes(order)
        ) {
            return res.status(400).json({
                message: 'Invalid sortBy or order value.',
                data: null
            });
        }

        const sortOrder = order === 'asc' ? 1 : -1;

        const books = await bookModel.find()
            .populate('categoryId')
            .sort({ [sortBy]: sortOrder });

        return res.status(200).json({
            message: 'Books sorted successfully.',
            data: books
        });
    } catch (error) {
        return res.status(500).json({
            message: 'Server side error.',
            data: null
        });
    }
};


/* =========================
   PAGINATE BOOKS
========================= */
const paginateBookController = async (req, res) => {
    try {
        const { page = '1', limit = '10' } = req.query;

        const pageNumber = Number(page);
        const limitNumber = Number(limit);

        if (
            !Number.isInteger(pageNumber) ||
            pageNumber < 1 ||
            !Number.isInteger(limitNumber) ||
            limitNumber < 1 ||
            limitNumber > 100
        ) {
            return res.status(400).json({
                message: 'Page must be at least 1 and limit must be between 1 and 100.',
                data: null
            });
        }

        const skip = (pageNumber - 1) * limitNumber;

        const [books, totalBooks] = await Promise.all([
            bookModel.find()
                .populate('categoryId')
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNumber),

            bookModel.countDocuments()
        ]);

        return res.status(200).json({
            message: 'Books fetched successfully.',
            data: books,
            pagination: {
                currentPage: pageNumber,
                limit: limitNumber,
                totalBooks,
                totalPages: Math.ceil(totalBooks / limitNumber)
            }
        });
    } catch (error) {
        return res.status(500).json({
            message: 'Server side error.',
            data: null
        });
    }
};


module.exports = {
    bookCreateController,
    allBookFetchController,
    singleBookFetchController,
    bookUpdateController,
    bookDeleteController,
    searchBookController,
    filterBookController,
    sortBookController,
    paginateBookController
};

