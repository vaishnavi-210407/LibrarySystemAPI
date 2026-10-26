
const mongoose = require('mongoose');

const fineModel = require('../../models/fines/fineModel');
const borrowingModel = require('../../models/borrowings/borrowingModel');

const isValidId = (id) => mongoose.isValidObjectId(id);


// CREATE FINE — Admin/Librarian
const createFineController = async (req, res) => {
    try {
        const { borrowingId, amount } = req.body;

        if (!isValidId(borrowingId)) {
            return res.status(400).json({
                message: 'Valid borrowingId is required.',
                data: null
            });
        }

        if (
            amount === undefined ||
            amount === null ||
            amount === '' ||
            !Number.isFinite(Number(amount)) ||
            Number(amount) <= 0
        ) {
            return res.status(400).json({
                message: 'Fine amount must be a positive number.',
                data: null
            });
        }

        const borrowing = await borrowingModel.findById(borrowingId);

        if (!borrowing) {
            return res.status(404).json({
                message: 'Borrowing record not found.',
                data: null
            });
        }

        if (borrowing.returnStatus !== 'returned') {
            return res.status(400).json({
                message: 'Fine can only be created after the book is returned.',
                data: null
            });
        }

        const existingFine = await fineModel.findOne({ borrowingId });

        if (existingFine) {
            return res.status(409).json({
                message: 'Fine already exists for this borrowing.',
                data: existingFine
            });
        }

        const fine = await fineModel.create({
            borrowingId,
            amount: Number(amount),
            status: 'unpaid'
        });

        return res.status(201).json({
            message: 'Fine created successfully.',
            data: fine
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                message: 'Fine already exists for this borrowing.',
                data: null
            });
        }

        if (error.name === 'ValidationError' || error.name === 'CastError') {
            return res.status(400).json({
                message: 'Invalid fine data.',
                data: null
            });
        }

        return res.status(500).json({
            message: 'Server side error.',
            data: null
        });
    }
};


// MEMBER: FETCH MY FINES
const fetchMyFineController = async (req, res) => {
    try {
        const borrowings = await borrowingModel.find({
            memberId: req.user.userId
        }).select('_id');

        const borrowingIds = borrowings.map(item => item._id);

        const fines = await fineModel.find({
            borrowingId: { $in: borrowingIds }
        })
            .populate({
                path: 'borrowingId',
                populate: {
                    path: 'copyId',
                    populate: { path: 'bookId' }
                }
            })
            .sort({ createdAt: -1 });

        return res.status(200).json({
            message: 'Your fines fetched successfully.',
            data: fines
        });
    } catch (error) {
        return res.status(500).json({
            message: 'Server side error.',
            data: null
        });
    }
};


// FETCH ALL FINES
const fetchAllFinesController = async (req, res) => {
    try {
        let query = {};

        // Members can see only their own fines.
        if (req.user.role === 'member') {
            const borrowings = await borrowingModel.find({
                memberId: req.user.userId
            }).select('_id');

            query.borrowingId = {
                $in: borrowings.map(item => item._id)
            };
        }

        const fines = await fineModel.find(query)
            .populate({
                path: 'borrowingId',
                populate: [
                    { path: 'memberId', select: '-password' },
                    {
                        path: 'copyId',
                        populate: { path: 'bookId' }
                    }
                ]
            })
            .sort({ createdAt: -1 });

        return res.status(200).json({
            message: 'Fines fetched successfully.',
            data: fines
        });
    } catch (error) {
        return res.status(500).json({
            message: 'Server side error.',
            data: null
        });
    }
};


// FETCH SINGLE FINE
const singleFineFetchController = async (req, res) => {
    try {
        const { id } = req.params;

        if (!isValidId(id)) {
            return res.status(400).json({
                message: 'Invalid fine ID.',
                data: null
            });
        }

        const fine = await fineModel.findById(id)
            .populate({
                path: 'borrowingId',
                populate: [
                    { path: 'memberId', select: '-password' },
                    {
                        path: 'copyId',
                        populate: { path: 'bookId' }
                    }
                ]
            });

        if (!fine) {
            return res.status(404).json({
                message: 'Fine not found.',
                data: null
            });
        }

        if (!fine.borrowingId || !fine.borrowingId.memberId) {
            return res.status(404).json({
                message: 'Related borrowing or member not found.',
                data: null
            });
        }

        if (
            req.user.role === 'member' &&
            fine.borrowingId.memberId._id.toString() !==
                req.user.userId.toString()
        ) {
            return res.status(403).json({
                message: 'You cannot view another member’s fine.',
                data: null
            });
        }

        return res.status(200).json({
            message: 'Fine fetched successfully.',
            data: fine
        });
    } catch (error) {
        return res.status(500).json({
            message: 'Server side error.',
            data: null
        });
    }
};


// UPDATE FINE — Admin/Librarian
const updateFineController = async (req, res) => {
    try {
        const { id } = req.params;
        const { amount, status } = req.body;

        if (!isValidId(id)) {
            return res.status(400).json({
                message: 'Invalid fine ID.',
                data: null
            });
        }

        if (amount === undefined && status === undefined) {
            return res.status(400).json({
                message: 'Provide amount or status to update.',
                data: null
            });
        }

        const fine = await fineModel.findById(id);

        if (!fine) {
            return res.status(404).json({
                message: 'Fine not found.',
                data: null
            });
        }

        // A paid fine cannot be changed back or edited.
        if (fine.status === 'paid') {
            return res.status(409).json({
                message: 'Paid fine records cannot be modified.',
                data: null
            });
        }

        if (amount !== undefined) {
            if (
                amount === '' ||
                !Number.isFinite(Number(amount)) ||
                Number(amount) <= 0
            ) {
                return res.status(400).json({
                    message: 'Amount must be a positive number.',
                    data: null
                });
            }

            fine.amount = Number(amount);
        }

        if (status !== undefined) {
            if (!['paid', 'unpaid'].includes(status)) {
                return res.status(400).json({
                    message: 'Status must be paid or unpaid.',
                    data: null
                });
            }

            fine.status = status;

            if (status === 'paid') {
                fine.paidAt = new Date();
            }
        }

        await fine.save();

        return res.status(200).json({
            message: 'Fine updated successfully.',
            data: fine
        });
    } catch (error) {
        if (error.name === 'ValidationError') {
            return res.status(400).json({
                message: 'Invalid fine data.',
                data: null
            });
        }

        return res.status(500).json({
            message: 'Server side error.',
            data: null
        });
    }
};


// DELETE FINE — Admin/Librarian

const deleteFineController = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                message: 'Invalid fine ID.',
                data: null
            });
        }

        const fine = await fineModel.findById(id);

        if (!fine) {
            return res.status(404).json({
                message: 'Fine not found.',
                data: null
            });
        }

        return res.status(409).json({
            message: 'Fine records cannot be deleted. Please preserve the payment history.',
            data: null
        });
    } catch (error) {
        console.error('Delete fine error:', error.message);

        return res.status(500).json({
            message: 'Server side error.',
            data: null
        });
    }
};



module.exports = {
    createFineController,
    fetchMyFineController,
    fetchAllFinesController,
    singleFineFetchController,
    updateFineController,
    deleteFineController
};
