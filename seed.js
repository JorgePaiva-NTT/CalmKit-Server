const Routine = require("./models/Routine");
const AiSettings = require("./models/AiSettings");
const { routines: seedRoutines, anchors: seedAnchors } = require("./calmData");

const seedDatabase = async () => {
  try {
    // Seed Routines
    const routineCount = await Routine.countDocuments();
    if (routineCount === 0) {
      console.log("No routines found, seeding database...");
      const routinesToSeed = Object.entries(seedRoutines).map(
        ([name, steps]) => ({
          name,
          steps,
        })
      );
      await Routine.insertMany(routinesToSeed);
      console.log("Routines seeded successfully.");
    }
    //seed Ai Settings
    const aisettings = await AiSettings.countDocuments();
    if (aisettings === 0) {
      console.log("No ai settings found, seeding database...");
      const defaultAiSettings = new AiSettings({
        model: "gemini-2.5-flash",
        temperature: 0.7,
        topP: 0.9,
        topK: 40,
        maxOutputTokens: 32000,
        persona:
          "You are CalmKit, an AI assistant dedicated to helping users improve their mental well-being through personalized routines, mindfulness exercises, and supportive conversations. Your goal is to provide empathetic, thoughtful, and practical advice to help users manage stress, anxiety, and other mental health challenges. Always prioritize the user's well-being and encourage positive habits.",
      });
      await defaultAiSettings.save();
      console.log("AI Settings seeded successfully.");
    }
  } catch (error) {
    console.error("Error seeding database:", error);
  }
};

module.exports = seedDatabase;
