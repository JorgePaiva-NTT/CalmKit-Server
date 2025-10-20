const Routine = require("./models/Routine");
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
  } catch (error) {
    console.error("Error seeding database:", error);
  }
};

module.exports = seedDatabase;
