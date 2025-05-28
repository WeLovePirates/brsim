# BRSim - Battle Royale Simulator

BRSim is a lightweight, browser-based simulation showcasing a dynamic battle royale scenario with various character classes. Each character possesses unique abilities and behaviors, interacting within the arena to be the last one standing.

## Features

* **Diverse Character Classes:** Play as (or observe) a growing roster of characters, each with distinct stats, special moves, and secondary abilities.
* **Dynamic AI:** Characters move autonomously, seeking out opponents, dodging danger, and intelligently using their abilities.
* **Real-time Combat:** Observe health bars, damage numbers, and ability effects in a continuous, fast-paced simulation.
* **Reusable Codebase:** Designed with modularity, allowing for easy expansion with new characters and abilities by leveraging existing mechanics.

## How to Run

1.  **Clone the Repository:**
    ```bash
    git clone [Your Repository URL Here]
    ```
2.  **Navigate to the Project Directory:**
    ```bash
    cd brsim
    ```
3.  **Open `index.html`:** Simply open the `index.html` file in your web browser. No local server is required.

## Project Structure

* `index.html`: The main HTML file for the game.
* `css/`: Contains styling for the game interface.
* `js/`: Contains all JavaScript logic.
    * `main.js`: Entry point for the game.
    * `config.js`: Global game constants and character definitions.
    * `utils/`: Helper functions (e.g., `displayUtils.js`, `mathUtils.js`).
    * `game/`: Game initialization and core loop logic (e.g., `gameInit.js`, `gameLoop.js`).
    * `character/`: Core character class and ability logic.
        * `Character.js`: The main `Character` class definition.
        * `characterMoves.js`: Logic for all "special moves."
        * `characterAbilities.js`: Logic for all "secondary abilities."
* `sprites/`: Stores character and effect sprite images.

## Development

Feel free to explore the code, modify existing characters, or create entirely new ones. The design prioritizes code reusability to make adding new content straightforward. Check the `js/config.js` file to see how new characters are defined and `characterMoves.js` and `characterAbilities.js` to understand how their abilities are implemented.

## Contributing

(Optional: Add guidelines for contributing if this is a public repo)

## License

(Optional: Add your project's license here, e.g., MIT, Apache 2.0, etc.)