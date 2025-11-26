







import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- CONFIGURATION COPY FROM CONSTANTS.TS ---
const REMOTE_WESNOTH_URL = "https://raw.githubusercontent.com/wesnoth/wesnoth/master/data/core/images";
const REMOTE_MC_URL = "https://raw.githubusercontent.com/Poudingue/Vanilla-Normals-Renewed/master/assets/minecraft/textures/block";

const TERRAIN_BASE_FILES = {
    'grass': 'terrain/grass/green',
    'plains': 'terrain/grass/semi-dry', 
    'water': 'terrain/water/coast-tile', 
    'desert': 'terrain/sand/desert',
    'swamp': 'terrain/swamp/water-tile', 
    'tundra': 'terrain/frozen/snow', 
    'taiga': 'terrain/grass/dry',
    'jungle': 'terrain/grass/green',
    'forest': 'terrain/grass/green',
    'cave_floor': 'terrain/cave/cave-floor3',
    'lava': 'terrain/cave/lava',
    'chasm': 'terrain/cave/chasm',
    'fungus': 'terrain/cave/cave-floor3',
};

const TRANSITION_COMBINATIONS = [
    'n-ne-se-s-sw-nw',
    'n-ne-se-s-sw', 'ne-se-s-sw-nw', 'se-s-sw-nw-n', 's-sw-nw-n-ne', 'sw-nw-n-ne-se', 'nw-n-ne-se-s',
    'n-ne-se-s', 'ne-se-s-sw', 'se-s-sw-nw', 's-sw-nw-n', 'sw-nw-n-ne', 'nw-n-ne-se',
    'n-ne-se', 'ne-se-s', 'se-s-sw', 's-sw-nw', 'sw-nw-n', 'nw-n-ne',
    'n-ne', 'ne-se', 'se-s', 's-sw', 'sw-nw', 'nw-n',
    'n', 'ne', 'se', 's', 'sw', 'nw'
];

// List of all files to download
// Structure: { url: string, dest: string }
const filesToDownload = [];

// 1. ASSETS LIST (Strictly matched to constants.ts)
const WESNOTH_FILES = [
    // Updated Unit List
    'units/human-loyalists/lieutenant.png', // Player Default
    'units/human-loyalists/swordsman.png',  // Fighter
    'units/human-magi/red-mage.png',        // Wizard
    'units/human-outlaws/thief.png',        // Rogue
    'units/human-magi/white-mage.png',      // Cleric
    'units/human-outlaws/thug.png',         // Barbarian
    'units/human-loyalists/fencer.png',     // Bard
    'units/elves-wood/shaman.png',          // Druid
    'units/human-loyalists/paladin.png',    // Paladin
    'units/human-loyalists/huntsman.png',   // Ranger
    'units/human-magi/silver-mage.png',     // Sorcerer
    'units/human-magi/dark-adept.png',      // Warlock

    'units/elves-wood/hero.png',            // Elf
    'units/dwarves/steelclad.png',          // Dwarf
    'units/elves-wood/fighter.png',         // Elf Fallback
    'units/dwarves/fighter.png',            // Dwarf Fallback
    
    // New Races
    'units/human-outlaws/footpad.png',      // Halfling
    'units/drakes/fighter.png',             // Dragonborn
    'units/dwarves/thunderer.png',          // Gnome
    'units/orcs/warrior.png',               // Half-Orc

    // Enemies
    'units/goblins/spearman.png',
    'units/orcs/grunt.png',
    'units/orcs/archer.png',
    'units/undead-skeletal/skeleton.png',
    'units/undead-skeletal/archer.png',
    'units/undead-necromancers/dark-sorcerer.png',
    'units/undead/walking-corpse.png',
    'units/monsters/wolf.png',
    'units/monsters/vampire-bat.png',
    
    // Base Terrains (Matched to cleaned constants.ts)
    'terrain/grass/green.png',
    'terrain/grass/semi-dry.png',
    'terrain/grass/dry.png',
    'terrain/frozen/snow.png',
    'terrain/water/coast-tile.png',
    'terrain/flat/dirt.png',
    'terrain/sand/desert.png',
    'terrain/swamp/water-tile.png',
    'terrain/cave/cave-floor3.png',
    'terrain/cave/lava.png',
    'terrain/cave/chasm.png',
    
    // Overlays (Now strictly using -tile.png as defined in constants.ts)
    'terrain/forest/pine-tile.png',
    'terrain/forest/deciduous-summer-tile.png',
    'terrain/forest/rainforest-tile.png',
    'terrain/forest/snow-forest-tile.png',
    'terrain/mountains/basic-tile.png',
    'terrain/mountains/dry-tile.png',
    'terrain/village/human-cottage.png',
    'terrain/castle/human-castle-tile.png', // Fixed
    'terrain/castle/human-ruins-tile.png', // Fixed
    'terrain/cave/fungus-tile.png',
    
    'weather/rain-heavy.png',
    
    // Items
    'items/potion-red.png',
    'items/potion-blue.png',
    'items/dagger.png',
    'items/sword.png',
    'items/hammer-runic.png',
    'items/staff.png',
    'items/bow.png',
    'items/shield.png',
    'items/armor.png',
    'items/armor-golden.png',
    'items/dagger-poison.png',
    'items/staff-ruby.png',
    'items/shield-polished.png',
    'items/potion-orange.png',
    'attacks/greatsword-human.png',
    'attacks/battleaxe.png',
    'attacks/axe.png',
    'attacks/mace.png',
    'attacks/saber-human.png'
];

const MC_FILES = [
    'grass_block_top.png',
    'podzol_top.png',
    'snow.png',
    'stone.png',
    'blue_concrete.png',
    'stone_bricks.png',
    'mossy_cobblestone.png',
    'oak_planks.png',
    'sand.png',
    'cobblestone.png',
    'mycelium_top.png',
    'lava_still.png',
    'black_concrete.png'
];

// Add Base Wesnoth Files
WESNOTH_FILES.forEach(f => {
    filesToDownload.push({
        url: `${REMOTE_WESNOTH_URL}/${f}`,
        dest: path.join('public', 'assets', 'wesnoth', f)
    });
});

// Add Minecraft Files
MC_FILES.forEach(f => {
    filesToDownload.push({
        url: `${REMOTE_MC_URL}/${f}`,
        dest: path.join('public', 'assets', 'minecraft', f)
    });
});

// 2. Generate Transition Files
Object.values(TERRAIN_BASE_FILES).forEach(basePath => {
    TRANSITION_COMBINATIONS.forEach(combo => {
        const f = `${basePath}-${combo}.png`;
        filesToDownload.push({
            url: `${REMOTE_WESNOTH_URL}/${f}`,
            dest: path.join('public', 'assets', 'wesnoth', f)
        });
    });
});


// --- DOWNLOAD LOGIC ---

const downloadFile = (url, dest) => {
    return new Promise((resolve, reject) => {
        const dir = path.dirname(dest);
        fs.mkdirSync(dir, { recursive: true });

        const file = fs.createWriteStream(dest);
        https.get(url, (response) => {
            if (response.statusCode === 200) {
                response.pipe(file);
                file.on('finish', () => {
                    file.close();
                    resolve(null);
                });
            } else if (response.statusCode === 404) {
                 // Some combinations might not exist, that is expected in Wesnoth autotiling logic sometimes
                 if (url.includes('trans')) {
                    fs.unlink(dest, () => {}); 
                    resolve(null); 
                 } else {
                    console.error(`Failed to find critical asset: ${url}`);
                    fs.unlink(dest, () => {});
                    resolve(null); 
                 }
            } else {
                fs.unlink(dest, () => {});
                reject(`Server responded with ${response.statusCode}: ${url}`);
            }
        }).on('error', (err) => {
            fs.unlink(dest, () => {});
            reject(err.message);
        });
    });
};

const run = async () => {
    console.log(`Starting download of ${filesToDownload.length} assets...`);
    
    // Process in chunks to avoid overwhelming connections
    const CHUNK_SIZE = 20;
    for (let i = 0; i < filesToDownload.length; i += CHUNK_SIZE) {
        const chunk = filesToDownload.slice(i, i + CHUNK_SIZE);
        await Promise.all(chunk.map(f => downloadFile(f.url, f.dest)));
        console.log(`Downloaded ${Math.min(i + CHUNK_SIZE, filesToDownload.length)} / ${filesToDownload.length}`);
    }
    
    console.log("\nDownload Complete!");
    console.log("-----------------------------------------------");
    console.log("IMPORTANT: Assets are now local. Ensure constants.ts has USE_LOCAL_ASSETS = true.");
    console.log("-----------------------------------------------");
};

run();