const errorMiddleware = (err, req, res, next) => {
    console.error("ERROR:", err);

    res.status(err.statusCode || err.status || 500).json({
        success: false,
        message: err.message || "Internal Server Error",
        ...(process.env.NODE_ENV === "development" && {
            stack: err.stack
        })
    });
};

module.exports = errorMiddleware;