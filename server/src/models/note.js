module.exports = (sequelize, DataTypes) => {
    const Note = sequelize.define('Note', {
        title: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                notEmpty: {
                    msg: "The title cannot be empty"
                },
                len: {
                    args: [2, 100],
                    msg: "The title must contain between 2 and 100 characters"
                }
            }
        },
        content: {
            type: DataTypes.TEXT,
            allowNull: false,
            validate: {
                notEmpty: {
                    msg: "The content cannot be empty"
                }
            }
        },
        folderId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'Folders',
                key: 'id'
            }
        }
    }, {
        tableName: 'Notes',
        timestamps: true,
        paranoid: true
    });

    Note.associate = function(models) {
        Note.belongsTo(models.Folder, { foreignKey: 'folderId', allowNull: true });
    };

    return Note;
};
