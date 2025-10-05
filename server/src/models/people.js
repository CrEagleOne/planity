module.exports = (sequelize, DataTypes) => {
    const People = sequelize.define('People', {
        last_name: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                notEmpty: {
                    msg: "The name cannot be empty"
                },
                len: {
                    args: [2, 50],
                    msg: "The name must contain between 2 and 50 characters"
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
        avatar: {
            type: DataTypes.TEXT,
            allowNull: true,
            validate: {
                isDataUrl(value) {
                    if (value && !value.startsWith('data:image')) {
                        throw new Error('The avatar must be a valid data URL');
                    }
                }
            }
        },
        birthday_date: {
            type: DataTypes.DATEONLY,
            allowNull: false,
            validate: {
                isDate: {
                    msg: "The birthday must be a valid date"
                }
            }
        }
    }, {
        tableName: 'People',
        timestamps: true,
        paranoid: true,
        indexes: [
            {
                unique: true,
                fields: ['first_name', 'last_name']
            }
        ],
    });

    People.associate = (models) => {
        People.belongsToMany(models.Event, {
            through: 'EventPeople',
            foreignKey: 'people_id',
            otherKey: 'event_id',
            as: 'events'
        });
        People.belongsToMany(models.Task, {
            through: 'TaskPeople',
            foreignKey: 'people_id',
            otherKey: 'task_id',
            as: 'tasks'
        });
    };

    return People;
};
