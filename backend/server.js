const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
require('dotenv').config();

const app = express();

// ============================================
// MIDDLEWARE
// ============================================

// Security middleware
app.use(helmet());

// Logging middleware
app.use(morgan('dev'));

// CORS middleware (allow frontend to connect)
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://your-portfolio.vercel.app'] 
    : '*',
  credentials: true
}));

// Body parser middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// ============================================
// MONGODB CONNECTION
// ============================================

mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => {
  console.log('✅ MongoDB connected successfully');
})
.catch(err => {
  console.error('❌ MongoDB connection failed:', err.message);
  process.exit(1);
});

// Handle connection errors
mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.warn('⚠️ MongoDB disconnected');
});

// ============================================
// MODELS
// ============================================

const projectSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please provide a project title'],
    trim: true,
    maxlength: [200, 'Title cannot exceed 200 characters']
  },
  description: {
    type: String,
    required: [true, 'Please provide a description'],
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  category: {
    type: String,
    enum: {
      values: ['AI/Computer Vision', 'Data Analytics', 'NLP/AI', 'Security/Mobile', 'Web Development'],
      message: '{VALUE} is not a valid category'
    },
    required: [true, 'Please select a category']
  },
  technologies: {
    type: [String],
    required: [true, 'Please add at least one technology'],
    validate: {
      validator: function(v) {
        return v.length > 0;
      },
      message: 'Technologies array cannot be empty'
    }
  },
  highlights: {
    type: [String],
    validate: {
      validator: function(v) {
        return v.length > 0;
      },
      message: 'Add at least one highlight'
    }
  },
  image: {
    type: String,
    default: null
  },
  github: {
    type: String,
    validate: {
      validator: function(v) {
        if (!v) return true;
        return /^https?:\/\/(www\.)?github\.com\//.test(v);
      },
      message: 'Please provide a valid GitHub URL'
    }
  },
  live: {
    type: String,
    validate: {
      validator: function(v) {
        if (!v) return true;
        return /^https?:\/\//.test(v);
      },
      message: 'Please provide a valid URL'
    }
  },
  impact: {
    type: String,
    default: null,
    maxlength: [500, 'Impact description cannot exceed 500 characters']
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Update the updatedAt field before saving
projectSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Project = mongoose.model('Project', projectSchema);

// ============================================
// ROUTES
// ============================================

// Health check
app.get('/', (req, res) => {
  res.status(200).json({
    message: '🚀 Portfolio Backend API is running',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// GET all projects
app.get('/api/projects', async (req, res) => {
  try {
    const { category, sort } = req.query;
    
    // Build filter
    let filter = {};
    if (category) {
      filter.category = category;
    }

    // Build sort
    let sortBy = { createdAt: -1 };
    if (sort === 'title') {
      sortBy = { title: 1 };
    } else if (sort === 'newest') {
      sortBy = { createdAt: -1 };
    }

    const projects = await Project.find(filter)
      .sort(sortBy)
      .lean();

    res.status(200).json({
      success: true,
      count: projects.length,
      data: projects
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching projects',
      error: error.message
    });
  }
});

// GET single project by ID
app.get('/api/projects/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid project ID'
      });
    }

    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    res.status(200).json({
      success: true,
      data: project
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching project',
      error: error.message
    });
  }
});

// CREATE new project
app.post('/api/projects', async (req, res) => {
  try {
    // Validate required fields
    const { title, description, category, technologies, highlights } = req.body;
    
    if (!title || !description || !category || !technologies) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: title, description, category, technologies'
      });
    }

    // Create new project
    const newProject = new Project({
      title,
      description,
      category,
      technologies: Array.isArray(technologies) ? technologies : [technologies],
      highlights: highlights ? (Array.isArray(highlights) ? highlights : [highlights]) : [],
      image: req.body.image || null,
      github: req.body.github || null,
      live: req.body.live || null,
      impact: req.body.impact || null
    });

    // Save to database
    await newProject.save();

    res.status(201).json({
      success: true,
      message: 'Project created successfully',
      data: newProject
    });
  } catch (error) {
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: messages
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error creating project',
      error: error.message
    });
  }
});

// UPDATE project
app.put('/api/projects/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid project ID'
      });
    }

    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    // Update fields
    if (req.body.title) project.title = req.body.title;
    if (req.body.description) project.description = req.body.description;
    if (req.body.category) project.category = req.body.category;
    if (req.body.technologies) {
      project.technologies = Array.isArray(req.body.technologies) 
        ? req.body.technologies 
        : [req.body.technologies];
    }
    if (req.body.highlights) {
      project.highlights = Array.isArray(req.body.highlights) 
        ? req.body.highlights 
        : [req.body.highlights];
    }
    if (req.body.image !== undefined) project.image = req.body.image;
    if (req.body.github !== undefined) project.github = req.body.github;
    if (req.body.live !== undefined) project.live = req.body.live;
    if (req.body.impact !== undefined) project.impact = req.body.impact;

    // Save updated project
    const updatedProject = await project.save();

    res.status(200).json({
      success: true,
      message: 'Project updated successfully',
      data: updatedProject
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: messages
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error updating project',
      error: error.message
    });
  }
});

// DELETE project
app.delete('/api/projects/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid project ID'
      });
    }

    const project = await Project.findByIdAndDelete(req.params.id);
    
    if (!project) {
      return res.status(404).json({
        success: false,
        message: 'Project not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Project deleted successfully',
      data: project
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error deleting project',
      error: error.message
    });
  }
});

// Get projects by category
app.get('/api/projects/category/:category', async (req, res) => {
  try {
    const projects = await Project.find({ category: req.params.category })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: projects.length,
      data: projects
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error fetching projects by category',
      error: error.message
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found'
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// ============================================
// START SERVER
// ============================================

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`\n🚀 Server is running on port ${PORT}`);
  console.log(`📍 API: http://localhost:${PORT}/api/projects`);
  console.log(`🏥 Health Check: http://localhost:${PORT}/`);
  console.log(`\n⚙️  Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`💾 Database: ${process.env.MONGODB_URI ? 'Connected' : 'Not configured'}\n`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('💥 Unhandled Rejection:', err);
  server.close(() => {
    process.exit(1);
  });
});

module.exports = app;