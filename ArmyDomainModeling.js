// title: Army Domain Modeling
// author: Santiago Ortiz Basualdo
// date: 2025-08-10
// version: 1.0.0

// description: This is a modeling exercise for Amalgama
// it simulates a battle between two armies that have different units
// units can be trained or transformed
// the army with the most strength wins the battle

// run the script to verify the modeling

// ==== Base Unit Class ====

class ArmyUnit {
	constructor(
		strength,
		trainingCost,
		trainingBonus,
		transformationCost = null
	) {
		this.strength = strength; // points that add to the strength of the army in battle
		this.trainingCost = trainingCost; // cost to train the unit
		this.trainingBonus = trainingBonus; // points that add to the strength of the unit after training
		this.transformationCost = transformationCost; // cost to transform the unit into another unit
		this.lifeTimeYears = 0; // years of service of the unit
	}

	// add training bonus to the unit
	train() {
		this.strength += this.trainingBonus;
		return this.strength;
	}

	// add a year to the unit's life time
	addLifeTime() {
		this.lifeTimeYears++;
		return this.lifeTimeYears;
	}
}

// ====== Unit Types ======
class Pikeman extends ArmyUnit {
	constructor() {
		super(5, 10, 3, 30);
	}
}
class Archer extends ArmyUnit {
	constructor() {
		super(10, 20, 7, 40);
	}
}
class Knight extends ArmyUnit {
	constructor() {
		super(20, 30, 10, null);
	} // cannot be transformed
}

Pikeman.nextTransform = { to: Archer };
Archer.nextTransform = { to: Knight };
Knight.nextTransform = null;

// ====== Army Class ======
class Army {
	constructor() {
		this.gold = 1000;
		this.units = [];
		this.battleHistory = [];
		this.createUnits(this.constructor.STARTING_UNITS || []);
	}

	// UNITS METHODS

	// create units from the starting units array
	createUnits(unitsArray) {
		for (const [UnitClass, count] of unitsArray) {
			for (let i = 0; i < count; i++) this.units.push(new UnitClass());
		}
	}

	// train a unit
	trainUnit(index) {
		const unit = this.units[index];
		if (!unit) throw new Error("Unit not found");
		if (this.gold < unit.trainingCost) throw new Error("Not enough gold");
		this.gold -= unit.trainingCost;
		unit.train();
	}

	// transform a unit
	transformUnit(index) {
		const u = this.units[index];
		if (!u) throw new Error("Unit not found");

		const rule = u.constructor.nextTransform;
		if (!rule) throw new Error("This unit cannot transform");
		if (u.transformationCost == null) throw new Error("No transformation cost");

		if (this.gold < u.transformationCost) throw new Error("Not enough gold");
		this.gold -= u.transformationCost;

		const { to: NextClass } = rule;
		const next = new NextClass();
		next.lifeTimeYears = u.lifeTimeYears; // keep life time

		this.units[index] = next; // replace the unit
		return next; // optional: return the new unit
	}

	// BATTLE METHODS

	// get the total strength of the army
	getTotalStrength() {
		return this.units.reduce((sum, u) => sum + u.strength, 0);
	}

	// remove the top n units from the army
	removeTopUnits(n) {
		this.units.sort((a, b) => b.strength - a.strength);
		const removed = this.units.splice(0, n);
		return removed.map((u) => ({
			type: u.constructor.name,
			strength: u.strength,
		}));
	}

	// battle two armies
	battle(opponent) {
		const when = new Date().toISOString();
		const myBefore = this.getTotalStrength();
		const oppBefore = opponent.getTotalStrength();

		let result,
			myGoldChange = 0,
			oppGoldChange = 0;
		let myLosses = [],
			oppLosses = [];

		// add a year to the life time of all units
		this.units.forEach((u) => u.addLifeTime());
		opponent.units.forEach((u) => u.addLifeTime());

		// battle logic
		if (myBefore > oppBefore) {
			result = `${this.constructor.name} wins`;
			myGoldChange = +100;
			oppGoldChange = 0;
			oppLosses = opponent.removeTopUnits(2);
		} else if (myBefore < oppBefore) {
			result = `${opponent.constructor.name} wins`;
			myGoldChange = 0;
			oppGoldChange = +100;
			myLosses = this.removeTopUnits(2);
		} else {
			result = "Draw";
			myLosses = this.removeTopUnits(1);
			oppLosses = opponent.removeTopUnits(1);
		}

		this.gold += myGoldChange;
		opponent.gold += oppGoldChange;

		// register in both battle histories
		const myEntry = {
			when,
			opponent: opponent.constructor.name,
			myScore: myBefore,
			oppScore: oppBefore,
			result,
			goldChange: myGoldChange,
			myLosses,
			oppLosses,
		};
		const oppEntry = {
			when,
			opponent: this.constructor.name,
			myScore: oppBefore,
			oppScore: myBefore,
			result,
			goldChange: oppGoldChange,
			myLosses: oppLosses,
			oppLosses: myLosses,
		};

		this.battleHistory.push(myEntry);
		opponent.battleHistory.push(oppEntry);

		return result;
	}
}

// ====== Army Types aka Civilizations ======

class Chinese extends Army {}
Chinese.STARTING_UNITS = [
	[Pikeman, 2],
	[Archer, 25],
	[Knight, 2],
];

class English extends Army {}
English.STARTING_UNITS = [
	[Pikeman, 10],
	[Archer, 10],
	[Knight, 10],
];

class Byzantine extends Army {}
Byzantine.STARTING_UNITS = [
	[Pikeman, 5],
	[Archer, 8],
	[Knight, 15],
];

// ===== Verification Script =====

(function verify() {
	// simple helpers
	const sep = () => console.log("=".repeat(60));
	const count = (army, Cls) =>
		army.units.filter((u) => u instanceof Cls).length;
	const printArmy = (name, army) => {
		console.log(`--- ${name} ---`);
		console.log(`Gold: ${army.gold}`);
		console.log(
			`Units: total=${army.units.length} | Pikeman=${count(
				army,
				Pikeman
			)} | Archer=${count(army, Archer)} | Knight=${count(army, Knight)}`
		);
		console.log(`Total strength: ${army.getTotalStrength()}`);
	};
	const avgAge = (army) => {
		if (army.units.length === 0) return 0;
		const sum = army.units.reduce((s, u) => s + u.lifeTimeYears, 0);
		return Number((sum / army.units.length).toFixed(2));
	};

	// 1) Create armies
	sep();
	console.log("Creating armies...");
	const A = new Chinese();
	const B = new English();
	printArmy("Chinese (A) - initial", A);
	printArmy("English (B) - initial", B);

	// 2) Trainings
	sep();
	console.log("Training some units...");
	console.log("A: train index 2 (Archer, +7, cost 20)");
	A.trainUnit(2);
	console.log("A: train index 27 (Knight, +10, cost 30)");
	A.trainUnit(27);
	console.log("B: train index 0 (Pikeman, +3, cost 10)");
	B.trainUnit(0);
	printArmy("Chinese (A) - after training", A);
	printArmy("English (B) - after training", B);

	// 3) Transformations
	sep();
	console.log("Transforming some units...");
	console.log("A: transform index 0 (Pikeman -> Archer, cost 30)");
	A.transformUnit(0);
	console.log("B: transform index 10 (Archer -> Knight, cost 40)");
	B.transformUnit(10);
	printArmy("Chinese (A) - after transform", A);
	printArmy("English (B) - after transform", B);

	// 4) Average age BEFORE battle
	sep();
	console.log("Average age BEFORE -> A:", avgAge(A), "| B:", avgAge(B));

	// Save sizes to verify losses later
	const sizeBeforeA = A.units.length;
	const sizeBeforeB = B.units.length;

	// 5) Single battle
	sep();
	console.log("Battle begins!");
	const result = A.battle(B);
	console.log("Battle result:", result);

	// 6) Post-battle status and losses
	sep();
	printArmy("Chinese (A) - after battle", A);
	printArmy("English (B) - after battle", B);
	const lostA = sizeBeforeA - A.units.length;
	const lostB = sizeBeforeB - B.units.length;
	console.log(`Losses ⇒ A: ${lostA} | B: ${lostB}`);

	sep();
	// 7) Average age AFTER battle
	console.log("Average age AFTER  -> A:", avgAge(A), "| B:", avgAge(B));

	// 8) History
	sep();
	console.log("Last history entry (A):", A.battleHistory.at(-1));
	console.log("Last history entry (B):", B.battleHistory.at(-1));
	sep();
})();
