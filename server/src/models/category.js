module.exports = (sequelize, DataTypes) => {
    const Category = sequelize.define('Category', {
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
        tableName: 'Category',
        timestamps: true,
        paranoid: true,
    });

    Category.associate = (models) => {
        Category.belongsToMany(models.Event, {
            through: 'EventCategory',
            foreignKey: 'category_id',
            otherKey: 'event_id',
            as: 'events'
        });
        Category.belongsToMany(models.Task, {
            through: 'TaskCategory',
            foreignKey: 'category_id',
            otherKey: 'task_id',
            as: 'tasks'
        });
    };

    return Category;
};
