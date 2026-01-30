const mongoose = require('mongoose');

const dailyLogSchema = new mongoose.Schema(
  {
    project: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true },
    folder: { type: mongoose.Schema.Types.ObjectId, ref: 'LogFolder' },
    date: { type: Date, required: true },
    weather: {
      condition: {
        type: String,
        enum: ['sunny', 'rainy', 'windy', 'cloudy', 'other'],
        default: 'other'
      },
      notes: { type: String, trim: true }
    },
    siteArea: { type: String, required: true, trim: true },
    activityType: {
      type: String,
      enum: ['excavation', 'rebar', 'concrete_pour', 'drainage', 'masonry', 'inspection', 'delivery', 'other'],
      required: true
    },
    summary: { type: String, required: true, trim: true },
    issuesRisks: { type: String, trim: true },
    nextSteps: { type: String, trim: true },
    potentialClaim: { type: Boolean, default: false },
    delayCause: { type: String, trim: true },
    instructionRef: { type: String, trim: true },
    impact: { type: String, trim: true },
    costNote: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('DailyLog', dailyLogSchema);
