module.exports = (sequelize, DataTypes) => {
    const Folder = sequelize.define('Folder', {
        name: {
            type: DataTypes.STRING,
            allowNull: false,
            validate: {
                notEmpty: {
                    msg: "The name cannot be empty"
                },
                len: {
                    args: [2, 100],
                    msg: "The name must contain between 2 and 100 characters"
                }
            }
        },
        parentId: {
            type: DataTypes.INTEGER,
            allowNull: true,
            references: {
                model: 'Folders',
                key: 'id'
            }
        }
    }, {
        tableName: 'Folders',
        timestamps: true,
        paranoid: true
    });

    // Initialize the root folder
    Folder.initializeRootFolder = async () => {
        try {
        const rootFolder = await Folder.findOne({ where: { id: 0 } });
        if (!rootFolder) {
            await Folder.create({
            id: 0,
            name: 'Root',
            parentId: null
            });
            console.log('Root folder created successfully.');
        } else {
            console.log('Root folder already exists.');
        }
        } catch (error) {
        console.error('Error creating root folder :', error);
        }
    };

    Folder.associate = function(models) {
        Folder.hasMany(models.Folder, { as: 'children', foreignKey: 'parentId' });
        Folder.belongsTo(models.Folder, { as: 'parent', foreignKey: 'parentId' });
        Folder.hasMany(models.Note, { foreignKey: 'folderId' });
    };

    return Folder;
};
