// data.js - Seed data for Dream Cafe Stock Manager

const SEED_DATA = (() => {
  const items = [
    { itemName: 'Milk',            category: 'Dairy',     unit: 'Liter',  currentStock: 15, minimumStock: 5  },
    { itemName: 'Coffee Powder',   category: 'Beverage',  unit: 'KG',     currentStock: 3,  minimumStock: 1  },
    { itemName: 'Tea Powder',      category: 'Beverage',  unit: 'KG',     currentStock: 2,  minimumStock: 1  },
    { itemName: 'Sugar',           category: 'Grocery',   unit: 'KG',     currentStock: 10, minimumStock: 2  },
    { itemName: 'Chocolate Syrup', category: 'Beverage',  unit: 'Liter',  currentStock: 4,  minimumStock: 2  },
    { itemName: 'Ice Cubes',       category: 'Other',     unit: 'KG',     currentStock: 20, minimumStock: 5  },
    { itemName: 'Bread',           category: 'Bakery',    unit: 'Piece',  currentStock: 30, minimumStock: 10 },
    { itemName: 'Chicken',         category: 'Meat',      unit: 'KG',     currentStock: 5,  minimumStock: 2  },
    { itemName: 'Cheese',          category: 'Dairy',     unit: 'KG',     currentStock: 3,  minimumStock: 1  },
    { itemName: 'Mayonnaise',      category: 'Condiment', unit: 'KG',     currentStock: 2,  minimumStock: 1  },
    { itemName: 'Tomato Sauce',    category: 'Condiment', unit: 'Liter',  currentStock: 3,  minimumStock: 1  },
    { itemName: 'Paper Cups',      category: 'Supplies',  unit: 'Packet', currentStock: 10, minimumStock: 3  },
    { itemName: 'Tissues',         category: 'Supplies',  unit: 'Packet', currentStock: 8,  minimumStock: 3  },
    { itemName: 'Water Bottles',   category: 'Beverage',  unit: 'Piece',  currentStock: 24, minimumStock: 12 },
  ];

  const initialize = () => {
    if (DB.getInventory().length === 0) {
      items.forEach(item => DB.addItem(item));
      console.log('[DreamCafe] Seed data loaded — 14 items.');
    }
  };

  return { initialize };
})();
