module.exports = (sequelize, DataTypes) => {
    const Task = sequelize.define('Task', {
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
        status: {
            type: DataTypes.STRING(20),
            allowNull: false,
            validate: {
                notEmpty: {
                    msg: "The status cannot be empty"
                },
                len: {
                    args: [2, 20],
                    msg: "The status must contain between 2 and 20 characters"
                }
            }
        },
        priority: {
            type: DataTypes.STRING(20),
            allowNull: false,
            validate: {
                notEmpty: {
                    msg: "The priority cannot be empty"
                },
                len: {
                    args: [2, 20],
                    msg: "The priority must contain between 2 and 20 characters"
                }
            }
        },
        start_date: {
            type: DataTypes.DATEONLY,
            allowNull: false,
            validate: {
                isDate: {
                msg: "The start date must be a valid date"
                }
            }
        },
        end_date: {
            type: DataTypes.DATEONLY,
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
        recurrence: {
            type: DataTypes.STRING(20),
            allowNull: false,
            validate: {
                notEmpty: {
                    msg: "The recurrence cannot be empty"
                },
                len: {
                    args: [2, 20],
                    msg: "The recurrence must contain between 2 and 20 characters"
                }
            }
        }

    }, {
        tableName: 'Task',
        timestamps: true,
        paranoid: true,
        indexes: [
            {
                unique: true,
                fields: ['title']
            }
        ],
    });

  Task.associate = (models) => {
        Task.belongsToMany(models.Category, {
            through: 'TaskCategory',
            foreignKey: 'task_id',
            otherKey: 'category_id',
            as: 'categories'
        });
        Task.belongsToMany(models.People, {
            through: 'TaskPeople',
            foreignKey: 'task_id',
            otherKey: 'people_id',
            as: 'people'
        });
  };

  return Task;
};
