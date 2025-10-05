module.exports = (sequelize, DataTypes) => {
    const Contact = sequelize.define('Contact', {
        last_name: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                notEmpty: {
                    msg: "The name cannot be empty"
                },
                len: {
                    args: [2, 50],
                    msg: "The name must contain between 2 and 120 characters"
                }
            }
        },
        first_name: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                notEmpty: {
                    msg: "The first name cannot be empty"
                },
                len: {
                    args: [2, 50],
                    msg: "The first name must contain between 2 and 50 characters"
                }
            }
        },
        birthday_date: {
            type: DataTypes.DATEONLY,
            allowNull: true,
            validate: {
                isDate: {
                    msg: "The birthday must be a valid date"
                }
            }
        },
        address: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        postal_code: {
            type: DataTypes.STRING,
            allowNull: true,
            validate: {
                isNumericIfProvided(value) {
                    if (value && !/^[0-9]+$/.test(value)) {
                        throw new Error("The postal code must contain numbers only");
                    }
                },
                lenIfProvided(value) {
                    if (value && (value.length < 2 || value.length > 20)) {
                        throw new Error("The postal code must contain between 2 and 20 characters");
                    }
                }
            }
        },
        city: {
            type: DataTypes.STRING,
            allowNull: true,
            validate: {
                lenIfProvided(value) {
                    if (value && (value.length < 2 || value.length > 50)) {
                        throw new Error("The city must contain between 2 and 50 characters");
                    }
                }
            }
        },
        country: {
            type: DataTypes.STRING,
            allowNull: true,
            validate: {
                lenIfProvided(value) {
                    if (value && (value.length < 2 || value.length > 50)) {
                        throw new Error("The country must contain between 2 and 50 characters");
                    }
                }
            }
        },
        email: {
            type: DataTypes.STRING,
            allowNull: true,
            validate: {
                isEmailIfProvided(value) {
                    if (value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
                        throw new Error("The email must be a valid email address");
                    }
                }
            }
        },
        mobile_phone: {
            type: DataTypes.STRING,
            allowNull: true,
            validate: {
                lenIfProvided(value) {
                    if (value && (value.length < 10 || value.length > 20)) {
                        throw new Error("The mobile phone number must contain between 10 and 20 characters");
                    }
                },
                startsWithDigitOrPlusIfProvided(value) {
                    if (value && !/^[0-9+]/.test(value)) {
                        throw new Error("The phone number must start with a number or a +");
                    }
                }
            }
        },
        fixed_phone: {
            type: DataTypes.STRING,
            allowNull: true,
            validate: {
                lenIfProvided(value) {
                    if (value && (value.length < 10 || value.length > 20)) {
                        throw new Error("The mobile phone number must contain between 10 and 20 characters");
                    }
                },
                startsWithDigitOrPlusIfProvided(value) {
                    if (value && !/^[0-9+]/.test(value)) {
                        throw new Error("The phone number must start with a number or a +");
                    }
                }
            }
        }
    }, {
        tableName: 'Contacts',
        timestamps: true,
        paranoid: true,
        indexes: [
            {
                unique: true,
                fields: ['first_name', 'last_name']
            }
        ],
    });
    return Contact;
};
