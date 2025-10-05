module.exports = (err, req, res, next) => {
  console.error('[ERROR]', err);
  res.status(err.status || 500).json({ error: err.message || 'Erreur serveur' });
};
