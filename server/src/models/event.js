module.exports = (sequelize, DataTypes) => {
    const Event = sequelize.define('Event', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        title: {
            type: DataTypes.STRING(120),
            allowNull: false,
            validate: {
                notEmpty: {
                    msg: "The title cannot be empty"
                },
                len: {
                    args: [2, 120],
                    msg: "The title must contain between 2 and 120 characters"
                }
            }
        },
        description: {
            type: DataTypes.STRING,
            allowNull: true,
        },
        start_date: {
            type: DataTypes.DATE,
            allowNull: false,
            validate: {
                isDate: {
                    msg: "The start date must be a valid date"
                }
            }
        },
        end_date: {
            type: DataTypes.DATE,
            allowNull: true,
            validate: {
                isDate: {
                    msg: "The end date must be a valid date"
                },
                isAfterstart_date(value) {
                    if (value && this.start_date && value < this.start_date) {
                        throw new Error('The end date must be after the start date');
                    }
                }
            }
        },
        color: {
            type: DataTypes.STRING(20)
        }
    }, {
        tableName: 'Event',
        timestamps: true,
        paranoid: true,
        indexes: [
            {
                unique: true,
                fields: ['title']
            }
        ],
    });

    Event.associate = (models) => {
        Event.belongsToMany(models.Category, {
            through: 'EventCategory',
            foreignKey: 'event_id',
            otherKey: 'category_id',
            as: 'categories'
        });

        Event.belongsToMany(models.People, {
            through: 'EventPeople',
            foreignKey: 'event_id',
            otherKey: 'people_id',
            as: 'people'
        });
    };

    return Event;
};
