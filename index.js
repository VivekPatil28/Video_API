const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const Video = require('./models/Video');
const path = require('path');
const fs = require('fs');
const ObjectId = mongoose.Types.ObjectId;

const app = express();
const port = 8000

app.use(express.json());

mongoose.connect('mongodb://localhost:27017/video_db')
    .then((data) => console.log('Connected to MongoDB'))
    .catch(err => console.error('Could not connect to MongoDB...', err));
    
    const fileFilter = (req, file, cb) => {
        if (file.mimetype === 'video/mp4') {
            cb(null, true);
        } else {
            cb(new Error('Only MP4 files are allowed!'), false);
        }
    };
    
const upload = multer({dest:"vidoes/", fileFilter:fileFilter})


app.get("/api/vidoes", async (req, res) => {
    try {
        const videos = await Video.find({},{_id:1,title:1,filename:1,createdAt:1,url:1})
        if (videos.length==0) {
            return res.status(404).json({ message: 'Vidoes Unavailable' });
        }

        res.status(200).json(videos);

    } catch (err) {
        res.status(500).json({ error: 'Failed to retrieve video', details: err.message });
    }
})

app.get('/api/video/:id', async (req, res) => {
    try {
        const video = await Video.findById(req.params.id);
        
        if (!video) {
            return res.status(404).json({ message: 'Video not found' });
        }
        const videoPath = path.resolve(video.path);

        if (!fs.existsSync(videoPath)) {
            return res.status(404).json({ message: 'File not found' });
        }

        res.setHeader('Content-Type', 'video/mp4');
        res.setHeader('Content-Disposition', `inline; filename="${video.filename}"`);

        const videoStream = fs.createReadStream(videoPath);
        videoStream.pipe(res);
    } catch (err) {
        res.status(500).json({ error: 'Failed to retrieve video', details: err.message });
    }
});

app.post("/api/save", upload.single("video"), async (req, res) => {
    try {
        const id = new ObjectId();
        const video = new Video({
            _id:id,
            title: req.body.title,
            path: req.file.path,
            filename: req.file.filename,
            url: `http://127.0.0.1:8000/api/video/${id}`
        })
        await video.save();
        res.status(201).json({ "message": "Video Uploaded Successfully.", video })
    } catch (err) {
        res.status(500).json({ "error": "Failed to upload video.", details: err.message })
    }
})

app.delete("/api/delete/:id",async (req, res) => {
    try {
        const video = await Video.findById(req.params.id);
        if (!video) {
            return res.status(404).json({ message: 'Video not found' });
        }
        const videoPath = path.resolve(video.path);
        if (fs.existsSync(videoPath)) {
            fs.unlinkSync(videoPath);
        }

        await Video.findByIdAndDelete(req.params.id);

        res.status(200).json({ message: 'Video deleted successfully' });
    } catch (err) {
        res.status(500).json({ error: 'Failed to delete video', details: err.message });
    }

})


app.listen(port, () => {
    console.log(`server started at port ${port}`)
})