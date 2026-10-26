
const mongoose = require('mongoose');

const borrowingModel = require('../../models/borrowings/borrowingModel');
const bookCopyModel = require('../../models/bookCopies/bookCopies');
const fineModel = require('../../models/fines/fineModel');
const userModel = require('../../models/users/userModel');
const roleModel = require('../../models/roles/roleModel');

const isValidId = (id) => mongoose.isValidObjectId(id);

const getFutureDueDate = (value) => {
    if (!value) return null;

    const date = new Date(value);

    if (Number.isNaN(date.getTime()) || date <= new Date()) {
        return null;
    }

    return date;
};

const serverError = (res) => res.status(500).json({
    message: 'Server side error.',
    data: null
});


// DIRECT ISSUE — Admin/Librarian
const createBorrowController = async (req, res) => {
    try {
        const { memberId, copyId, dueDate } = req.body;
        const due = getFutureDueDate(dueDate);

        if (!isValidId(memberId) || !isValidId(copyId) || !due) {
            return res.status(400).json({
                message: 'Valid memberId, copyId and future dueDate are required.',
                data: null
            });
        }

        const member = await userModel.findById(memberId);

        if (!member || member.status !== 'active') {
            return res.status(404).json({
                message: 'Active member not found.',
                data: null
            });
        }

        const memberRole = await roleModel.findById(member.roleId);

        if (!memberRole || memberRole.name !== 'member') {
            return res.status(400).json({
                message: 'Selected user is not a member.',
                data: null
            });
        }

        // Atomically claim an available copy to prevent two issues at once.
        const copy = await bookCopyModel.findOneAndUpdate(
            { _id: copyId, status: 'available' },
            { $set: { status: 'unavailable' } },
            { new: true }
        );

        if (!copy) {
            return res.status(409).json({
                message: 'Book copy not found or unavailable.',
                data: null
            });
        }

        try {
            const borrow = await borrowingModel.create({
                memberId,
                copyId,
                librarianId: req.user.userId,
                issueDate: new Date(),
                dueDate: due,
                requestStatus: 'approved',
                returnStatus: 'notReturned'
            });

            return res.status(201).json({
                message: 'Book issued successfully.',
                data: borrow
            });
        } catch (error) {
            await bookCopyModel.findByIdAndUpdate(copyId, {
                $set: { status: 'available' }
            });
            throw error;
        }
    } catch (error) {
        if (error.name === 'ValidationError' || error.name === 'CastError') {
            return res.status(400).json({
                message: 'Invalid borrowing data.',
                data: null
            });
        }

        return serverError(res);
    }
};


// MEMBER REQUESTS A BOOK
const createBorrowRequestController = async (req, res) => {
    try {
        const { copyId, dueDate } = req.body;
        const due = getFutureDueDate(dueDate);

        if (!isValidId(copyId) || !due) {
            return res.status(400).json({
                message: 'Valid copyId and future dueDate are required.',
                data: null
            });
        }

        const member = await userModel.findById(req.user.userId);

        if (!member || member.status !== 'active') {
            return res.status(403).json({
                message: 'Active member account required.',
                data: null
            });
        }

        const copy = await bookCopyModel.findById(copyId);

        if (!copy || copy.status !== 'available') {
            return res.status(409).json({
                message: 'Book copy not found or unavailable.',
                data: null
            });
        }

        // Prevent multiple pending requests from the same member for the same copy.
        const existingRequest = await borrowingModel.findOne({
            memberId: req.user.userId,
            copyId,
            requestStatus: 'pending'
        });

        if (existingRequest) {
            return res.status(409).json({
                message: 'You already have a pending request for this copy.',
                data: existingRequest
            });
        }

        const request = await borrowingModel.create({
            memberId: req.user.userId,
            copyId,
            dueDate: due,
            requestStatus: 'pending',
            returnStatus: 'notReturned'
        });

        return res.status(201).json({
            message: 'Book request sent successfully.',
            data: request
        });
    } catch (error) {
        if (error.name === 'ValidationError' || error.name === 'CastError') {
            return res.status(400).json({
                message: 'Invalid borrowing request.',
                data: null
            });
        }

        return serverError(res);
    }
};


// FETCH PENDING REQUESTS — Admin/Librarian
const fetchPendingBorrowRequestController = async (req, res) => {
    try {
        const requests = await borrowingModel
            .find({ requestStatus: 'pending' })
            .populate('memberId', '-password')
            .populate({
                path: 'copyId',
                populate: { path: 'bookId' }
            })
            .sort({ createdAt: 1 });

        return res.status(200).json({
            message: 'Pending requests fetched successfully.',
            data: requests
        });
    } catch (error) {
        return serverError(res);
    }
};


// APPROVE REQUEST — Admin/Librarian
const approveBorrowRequestController = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidId(id)) {
            return res.status(400).json({
                message: 'Invalid borrowing request ID.',
                data: null
            });
        }

        const borrow = await borrowingModel.findOne({
            _id: id,
            requestStatus: 'pending'
        });

        if (!borrow) {
            return res.status(404).json({
                message: 'Pending borrowing request not found or already processed.',
                data: null
            });
        }

        const member = await userModel.findById(borrow.memberId);

        if (!member || member.status !== 'active') {
            return res.status(400).json({
                message: 'Member account is inactive or no longer exists.',
                data: null
            });
        }

        const copy = await bookCopyModel.findOneAndUpdate(
            { _id: borrow.copyId, status: 'available' },
            { $set: { status: 'unavailable' } },
            { new: true }
        );

        if (!copy) {
            return res.status(409).json({
                message: 'This book copy is no longer available.',
                data: null
            });
        }

        borrow.librarianId = req.user.userId;
        borrow.issueDate = new Date();
        borrow.requestStatus = 'approved';

        try {
            await borrow.save();
        } catch (error) {
            await bookCopyModel.findByIdAndUpdate(copy._id, {
                $set: { status: 'available' }
            });
            throw error;
        }

        return res.status(200).json({
            message: 'Request approved and book issued successfully.',
            data: borrow
        });
    } catch (error) {
        if (error.name === 'ValidationError' || error.name === 'CastError') {
            return res.status(400).json({
                message: 'Invalid borrowing data.',
                data: null
            });
        }

        return serverError(res);
    }
};


// REJECT REQUEST — Admin/Librarian
const rejectBorrowRequestController = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidId(id)) {
            return res.status(400).json({
                message: 'Invalid borrowing request ID.',
                data: null
            });
        }

        const borrow = await borrowingModel.findOneAndUpdate(
            { _id: id, requestStatus: 'pending' },
            { $set: { requestStatus: 'rejected' } },
            { new: true, runValidators: true }
        );

        if (!borrow) {
            return res.status(404).json({
                message: 'Pending borrowing request not found or already processed.',
                data: null
            });
        }

        return res.status(200).json({
            message: 'Borrowing request rejected.',
            data: borrow
        });
    } catch (error) {
        return serverError(res);
    }
};


// MEMBER: ALL MY BORROWINGS
const fetchMyBorrowController = async (req, res) => {
    try {
        const borrowings = await borrowingModel
            .find({ memberId: req.user.userId })
            .populate({
                path: 'copyId',
                populate: { path: 'bookId' }
            })
            .populate('librarianId', '-password')
            .sort({ createdAt: -1 });

        return res.status(200).json({
            message: 'Your borrowings fetched successfully.',
            data: borrowings
        });
    } catch (error) {
        return serverError(res);
    }
};


// MEMBER: CURRENT BORROWINGS
const fetchMyCurrentBorrowController = async (req, res) => {
    try {
        const borrowings = await borrowingModel
            .find({
                memberId: req.user.userId,
                requestStatus: 'approved',
                returnStatus: 'notReturned'
            })
            .populate({
                path: 'copyId',
                populate: { path: 'bookId' }
            })
            .populate('librarianId', '-password');

        return res.status(200).json({
            message: 'Current borrowed books fetched successfully.',
            data: borrowings
        });
    } catch (error) {
        return serverError(res);
    }
};


// MEMBER: RETURNED BORROWING HISTORY
const fetchMyBorrowHistoryController = async (req, res) => {
    try {
        const history = await borrowingModel
            .find({
                memberId: req.user.userId,
                returnStatus: 'returned'
            })
            .populate({
                path: 'copyId',
                populate: { path: 'bookId' }
            })
            .populate('librarianId', '-password')
            .sort({ returnDate: -1 });

        return res.status(200).json({
            message: 'Borrowing history fetched successfully.',
            data: history
        });
    } catch (error) {
        return serverError(res);
    }
};


// FETCH ALL BORROWINGS
const fetchAllBorrowController = async (req, res) => {
    try {
        const query = {};

        if (req.user.role === 'member') {
            query.memberId = req.user.userId;
        }

        const borrowings = await borrowingModel
            .find(query)
            .populate('memberId', '-password')
            .populate({
                path: 'copyId',
                populate: { path: 'bookId' }
            })
            .populate('librarianId', '-password')
            .sort({ createdAt: -1 });

        return res.status(200).json({
            message: 'Borrowings fetched successfully.',
            data: borrowings
        });
    } catch (error) {
        return serverError(res);
    }
};


// FETCH ONE BORROWING
const singleBorrowFetchController = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidId(id)) {
            return res.status(400).json({
                message: 'Invalid borrowing ID.',
                data: null
            });
        }

        const borrowing = await borrowingModel
            .findById(id)
            .populate('memberId', '-password')
            .populate({
                path: 'copyId',
                populate: { path: 'bookId' }
            })
            .populate('librarianId', '-password');

        if (!borrowing) {
            return res.status(404).json({
                message: 'Borrowing not found.',
                data: null
            });
        }

        if (
            req.user.role === 'member' &&
            borrowing.memberId._id.toString() !== req.user.userId.toString()
        ) {
            return res.status(403).json({
                message: "You cannot view another member's borrowing.",
                data: null
            });
        }

        return res.status(200).json({
            message: 'Borrowing fetched successfully.',
            data: borrowing
        });
    } catch (error) {
        return serverError(res);
    }
};


// UPDATE DUE DATE — Admin/Librarian
const updateBorrowController = async (req, res) => {
    try {
        const { id } = req.params;
        const due = getFutureDueDate(req.body.dueDate);

        if (!isValidId(id) || !due) {
            return res.status(400).json({
                message: 'Valid borrowing ID and future dueDate are required.',
                data: null
            });
        }

        const borrow = await borrowingModel.findById(id);

        if (!borrow) {
            return res.status(404).json({
                message: 'Borrowing not found.',
                data: null
            });
        }

        if (
            borrow.requestStatus !== 'approved' ||
            borrow.returnStatus === 'returned'
        ) {
            return res.status(400).json({
                message: 'Only active borrowings can be updated.',
                data: null
            });
        }

        if (due <= borrow.issueDate) {
            return res.status(400).json({
                message: 'Due date must be after the issue date.',
                data: null
            });
        }

        borrow.dueDate = due;
        await borrow.save();

        return res.status(200).json({
            message: 'Due date updated successfully.',
            data: borrow
        });
    } catch (error) {
        return serverError(res);
    }
};


// DELETE NON-ACTIVE BORROWING — Admin/Librarian

const deleteBorrowController = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidId(id)) {
            return res.status(400).json({
                message: 'Invalid borrowing ID.',
                data: null
            });
        }

        const borrow = await borrowingModel.findById(id);

        if (!borrow) {
            return res.status(404).json({
                message: 'Borrowing not found.',
                data: null
            });
        }

        return res.status(409).json({
            message: 'Borrowing records cannot be deleted because they are part of the library history.',
            data: null
        });
    } catch (error) {
        return serverError(res);
    }
};



// RETURN BOOK + CREATE LATE FINE

const returnBorrowController = async (req, res) => {
    let session;

    try {
        const { id } = req.params;

        if (!isValidId(id)) {
            return res.status(400).json({
                message: 'Invalid borrowing ID.',
                data: null
            });
        }

        session = await mongoose.startSession();

        let result;

        await session.withTransaction(async () => {
            // 1. Find active borrowing
            const borrow = await borrowingModel.findOne({
                _id: id,
                requestStatus: 'approved',
                returnStatus: 'notReturned'
            }).session(session);

            if (!borrow) {
                const error = new Error(
                    'Active borrowing not found or book already returned.'
                );
                error.statusCode = 404;
                throw error;
            }

            const returnDate = new Date();

            // 2. Mark borrowing as returned atomically
            const updatedBorrow = await borrowingModel.findOneAndUpdate(
                {
                    _id: id,
                    requestStatus: 'approved',
                    returnStatus: 'notReturned'
                },
                {
                    $set: {
                        returnStatus: 'returned',
                        returnDate
                    }
                },
                {
                    new: true,
                    session,
                    runValidators: true
                }
            );

            if (!updatedBorrow) {
                const error = new Error(
                    'This borrowing has already been processed.'
                );
                error.statusCode = 409;
                throw error;
            }

            // 3. Make the physical copy available
            const updatedCopy = await bookCopyModel.findOneAndUpdate(
                {
                    _id: borrow.copyId,
                    status: 'unavailable'
                },
                {
                    $set: { status: 'available' }
                },
                {
                    new: true,
                    session
                }
            );

            if (!updatedCopy) {
                const error = new Error(
                    'Book copy not found or its status is inconsistent.'
                );
                error.statusCode = 409;
                throw error;
            }

            // 4. Calculate late fine: ₹20 per day
            let fine = null;

            if (returnDate > borrow.dueDate) {
                const lateDays = Math.ceil(
                    (returnDate.getTime() - borrow.dueDate.getTime()) /
                    (1000 * 60 * 60 * 24)
                );

                const fineAmount = lateDays * 20;

                // Avoid creating a duplicate fine
                fine = await fineModel.findOne({
                    borrowingId: borrow._id
                }).session(session);

                if (!fine) {
                    const createdFines = await fineModel.create(
                        [{
                            borrowingId: borrow._id,
                            amount: fineAmount,
                            status: 'unpaid'
                        }],
                        { session }
                    );

                    fine = createdFines[0];
                }
            }

            result = {
                borrowing: updatedBorrow,
                fine
            };
        });

        return res.status(200).json({
            message: result.fine
                ? 'Book returned successfully. Late fine recorded.'
                : 'Book returned successfully. No fine is due.',
            data: result
        });
    } catch (error) {
        if (error.statusCode) {
            return res.status(error.statusCode).json({
                message: error.message,
                data: null
            });
        }

        if (error.code === 11000) {
            return res.status(409).json({
                message: 'A fine record already exists for this borrowing.',
                data: null
            });
        }

        console.error('Return borrowing error:', error.message);

        return res.status(500).json({
            message: 'Server side error.',
            data: null
        });
    } finally {
        if (session) {
            await session.endSession();
        }
    }
};


module.exports = {
    createBorrowController,
    createBorrowRequestController,
    fetchPendingBorrowRequestController,
    approveBorrowRequestController,
    rejectBorrowRequestController,
    fetchMyBorrowController,
    fetchMyCurrentBorrowController,
    fetchMyBorrowHistoryController,
    fetchAllBorrowController,
    singleBorrowFetchController,
    updateBorrowController,
    deleteBorrowController,
    returnBorrowController
};
