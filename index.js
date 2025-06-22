const {GoogleGenerativeAI, HarmCategory, HarmBlockThreshold} = require("@google/generative-ai");
const dotenv = require("dotenv");
const fs = require("fs");
const express = require("express");
const multer = require("multer");
const path = require("path");

function imageToGenerativePart(imagePath) {
  const imageFile = fs.readFileSync(imagePath);
  const mimeType = path.extname(imagePath).toLowerCase() === '.png' ? 'image/png' : 'image/jpeg';
  return {
    inlineData: {
      data: Buffer.from(imageFile).toString('base64'),
      mimeType
    }
  };
}

dotenv.config();
const app = express();
app.use(express.json());

const genAI = new GoogleGenerativeAI(process.env.API_KEY);
const model = genAI.getGenerativeModel({model: "gemini-1.5-flash"});

const upload = multer({dest: 'uploads/'});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Gemini API Server is running at http://localhost:${PORT}`);
})

app.post('/generate-text', async (req, res) => {
    const {prompt} = req.body;
    try {
        let result = await model.generateContent(prompt);
        let response = await result.response;
        res.json({text: response.text()});
    } catch (error) {
        console.error(error);
        res.status(500).json({error: 'Failed to generate text'});
    }
})

app.post('/generate-from-image', upload.single('image'), async (req, res) => {
    {
        const prompt = req.body.prompt || "Describe the image";
        const image = imageToGenerativePart(req.file.path);
        try {
            let result = await model.generateContent([prompt, image]);
            let response = await result.response;
            res.json({text: response.text()});
        } catch (error) {
            console.error(error);
            res.status(500).json({error: 'Failed to generate text from image'});
        } finally {
            fs.unlinkSync(req.file.path);
        }
    }
})

app.post('/generate-from-document', upload.single('document'), async (req, res) => {
    const filePath = req.file.path;
    const buffer = fs.readFileSync(filePath);
    const base64Data = buffer.toString('base64');
    const mimeType = req.file.mimetype;

    try {
        let documentPart = {
            inlineData: {
                data: base64Data,
                mimeType: mimeType
            }
        };
        let result = await model.generateContent(["Analyze this document:", documentPart]);
        let response = await result.response;
        res.json({text: response.text()});
    } catch (error) {
        res.status(500).json({error: 'Failed to generate document'});
    } finally {
        fs.unlinkSync(filePath);
    }

})

app.post('/generate-from-audio', upload.single('audio'), async (req, res) => {
    const audioBuffer = fs.readFileSync(req.file.path);
    const base64Audio = audioBuffer.toString('base64');
    const audioPart = {
        inlineData: {
            data: base64Audio,
            mimeType: req.file.mimetype
        }
    };

    try {
        let result = await model.generateContent([
            "Transcribe or analyze the following audio:", audioPart]);
        let response = await result.response;
        res.json({text: response.text()});
    } catch (error) {
        console.error(error);
        res.status(500).json({error: 'Failed to generate audio content'});
    } finally {
        fs.unlinkSync(req.file.path);
    }
})


// async function run() {
//     try {
//         let prompt = "Write a story about a AI and magic"
//         let result = await model.generateContent(prompt);
//         let response = await result.response;
//         console.log(response.text());
//     } catch (error) {
//         console.log(error)
//     }
// }
//
// run();
