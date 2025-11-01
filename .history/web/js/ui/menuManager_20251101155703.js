// Menu manager handles all screen transitions and UI

class MenuManager {
  constructor(campaignManager, progression, sound = null, modal = null) {
    this.campaign = campaignManager;
    this.progression = progression;
    this.sound = sound;
    this.modal = modal;
    this.currentScreen = "main-menu";

    // Create sprite generator for ship illustrations
    this.spriteGenerator = new SpriteGenerator();

    // Upgrade manager
    this.upgradeManager = new UpgradeManager();
    this.selectedUpgrades = new Map(); // shipId -> upgradeKey

    this.setupEventListeners();
    this.updateMainMenu();
  }

  setupEventListeners() {
    // Main menu
    document
      .getElementById("new-campaign-btn")
      .addEventListener("click", () => {
        if (this.sound) this.sound.playClick();
        this.startNewCampaign();
      });

    document.getElementById("continue-btn").addEventListener("click", () => {
      if (this.sound) this.sound.playClick();
      this.continueCampaign();
    });

    // Shipyard
    document
      .getElementById("launch-battle-btn")
      .addEventListener("click", () => {
        if (this.sound) this.sound.playClick();
        this.launchBattle();
      });

    document
      .getElementById("back-to-menu-btn")
      .addEventListener("click", () => {
        if (this.sound) this.sound.playClick();
        this.showScreen("main-menu");
      });

    // Post-battle
    document
      .getElementById("continue-campaign-btn")
      .addEventListener("click", () => {
        if (this.sound) this.sound.playClick();
        this.continueFromBattle();
      });

    document
      .getElementById("abandon-campaign-btn")
      .addEventListener("click", () => {
        if (this.sound) this.sound.playClick();
        this.abandonCampaign();
      });

    // Upgrades
    document
      .getElementById("finish-upgrades-btn")
      .addEventListener("click", () => {
        if (this.sound) this.sound.playClick();
        this.finishUpgrades();
      });
  }

  showScreen(screenId) {
    if (this.sound) this.sound.playMenuTransition();

    // Hide all screens
    document.querySelectorAll(".screen").forEach((screen) => {
      screen.classList.remove("active");
    });

    // Show target screen
    document.getElementById(screenId).classList.add("active");
    this.currentScreen = screenId;
  }

  updateMainMenu() {
    // Check if there's a saved campaign
    const hasSave = this.campaign.loadCampaign();
    document.getElementById("continue-btn").disabled = !hasSave;
  }

  startNewCampaign() {
    this.campaign.startNewCampaign();
    this.progression.setNewCampaignState();
    this.showShipyard();
  }

  continueCampaign() {
    if (this.campaign.loadCampaign()) {
      this.showShipyard();
    }
  }

  showShipyard() {
    this.showScreen("shipyard-screen");
    this.updateShipyard();
  }

  updateShipyard() {
    // Update campaign info
    document.getElementById("credits-display").textContent =
      this.progression.credits;
    document.getElementById("battle-number").textContent =
      this.campaign.battleNumber;

    // Show available ships
    this.renderAvailableShips();
  }

  renderAvailableShips() {
    const container = document.getElementById("ship-selection");
    container.innerHTML = "";

    // Show owned ships with repair options
    const ownedShips = this.progression.ownedShips;

    if (ownedShips && ownedShips.length > 0) {
      const fleetHeader = document.createElement("h3");
      fleetHeader.textContent = "⚔️ Your Fleet";
      fleetHeader.style.gridColumn = "1 / -1"; // Span all columns
      container.appendChild(fleetHeader);

      ownedShips.forEach((ownedShip, index) => {
        let preset = SHIP_PRESETS[ownedShip.shipClass];
        if (!preset) {
          const fallback = SHIP_PRESETS.interceptor;
          if (!fallback) return;
          ownedShip = {
            ...ownedShip,
            shipClass: "interceptor",
            hull: fallback.maxHull,
            maxHull: fallback.maxHull,
          };
          preset = fallback;
        }

        const tempShip = new Ship({
          ...preset,
          name: `${ownedShip.shipClass.charAt(0).toUpperCase() + ownedShip.shipClass.slice(1)} ${index + 1}`,
          position: new HexCoord(0, 0),
          team: "player",
          hull: ownedShip.hull,
          maxHull: ownedShip.maxHull,
          upgrades: ownedShip.upgrades || [],
        });

        // Re-apply saved upgrades to show correct stats
        if (ownedShip.upgrades && ownedShip.upgrades.length > 0) {
          ownedShip.upgrades.forEach((upgradeKey) => {
            this.upgradeManager.applyUpgrade(tempShip, upgradeKey);
          });
        }

        const card = this.createOwnedShipCard(tempShip, index);
        container.appendChild(card);
      });
    }

    // Add shop section
    debugger;
    const shopHeader = document.createElement("h3");
    shopHeader.textContent = "🛒 Ship Shop";
    shopHeader.style.gridColumn = "1 / -1"; // Span all columns
    shopHeader.style.marginTop =
      ownedShips && ownedShips.length > 0 ? "20px" : "0";
    container.appendChild(shopHeader);

    // Empty state for shop
    const availableTypes =
      this.progression.unlockedShips &&
      this.progression.unlockedShips.length > 0
        ? this.progression.unlockedShips
        : Object.keys(SHIP_PRESETS);

    if (!ownedShips || ownedShips.length === 0) {
      const emptyState = document.createElement("div");
      emptyState.style.gridColumn = "1 / -1";
      emptyState.style.padding = "20px";
      emptyState.style.textAlign = "center";
      emptyState.style.color = "#6ab9ff";
      emptyState.style.fontSize = "16px";
      emptyState.style.background = "#151923";
      emptyState.style.borderRadius = "10px";
      emptyState.style.border = "2px dashed #2a3f5f";
      emptyState.style.marginBottom = "16px";
      emptyState.innerHTML =
        "💫 <strong>Welcome, Commander!</strong><br><br>Purchase your first ship below to begin your campaign.";
      container.appendChild(emptyState);
    }

    availableTypes.forEach((shipType) => {
      const preset = SHIP_PRESETS[shipType];
      if (!preset) {
        console.warn("Unknown ship preset:", shipType);
        return;
      }

      const shopCard = this.createShopCard(shipType, preset);
      console.log("shopCard", shopCard);
      container.appendChild(shopCard);
    });
  }

  createOwnedShipCard(ship, index) {
    const card = this.createShipCard(ship, false);

    // Add repair button if damaged
    if (ship.hull < ship.maxHull) {
      const repairCost = Math.ceil((ship.maxHull - ship.hull) * 0.5);
      const repairBtn = document.createElement("button");
      repairBtn.className = "action-btn";
      repairBtn.style.width = "100%";
      repairBtn.style.marginTop = "10px";
      repairBtn.textContent = `Repair (${repairCost}₡)`;
      repairBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        if (this.progression.repairShip(index, ship.maxHull - ship.hull)) {
          if (this.sound) this.sound.playClick();
          this.updateShipyard();
        } else if (this.modal) {
          this.modal.alert(
            "Insufficient Credits",
            "You don't have enough credits to repair this ship.",
          );
        }
      });
      card.appendChild(repairBtn);
    } else {
      // Show ready status if fully repaired
      const readyLabel = document.createElement("div");
      readyLabel.style.marginTop = "10px";
      readyLabel.style.color = "#44ff44";
      readyLabel.style.fontWeight = "bold";
      readyLabel.textContent = "✓ Ready for Battle";
      card.appendChild(readyLabel);
    }

    return card;
  }

  createShopCard(shipType, preset) {
    const tempShip = new Ship({
      ...preset,
      name: `New ${shipType.charAt(0).toUpperCase() + shipType.slice(1)}`,
      position: new HexCoord(0, 0),
      team: "player",
    });

    const card = this.createShipCard(tempShip, false);
    card.style.opacity = "0.8";

    const buyBtn = document.createElement("button");
    buyBtn.className = "action-btn";
    buyBtn.style.width = "100%";
    buyBtn.style.marginTop = "10px";
    buyBtn.style.background = "#2a5f3f";
    buyBtn.style.borderColor = "#44ff44";
    buyBtn.textContent = `Buy (${preset.creditCost}₡)`;
    buyBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (this.progression.buyShip(shipType)) {
        if (this.sound) this.sound.playClick();
        this.updateShipyard();
      } else if (this.modal) {
        this.modal.alert(
          "Insufficient Credits",
          `You need ${preset.creditCost}₡ to purchase this ship.`,
        );
      }
    });
    card.appendChild(buyBtn);

    return card;
  }

  createShipCard(ship) {
    const card = document.createElement("div");
    card.className = "ship-card";

    if (ship.hull < ship.maxHull * 0.5) {
      card.classList.add("damaged");
    }

    const hullPercent = (ship.hull / ship.maxHull) * 100;

    // Generate ship sprite
    const spriteCanvas = this.spriteGenerator.generateShipSprite(
      ship.shipClass,
      ship.team,
    );

    // Create a container div for the sprite
    const spriteContainer = document.createElement("div");
    spriteContainer.className = "ship-illustration";
    if (spriteCanvas && spriteCanvas.style) {
      spriteCanvas.style.maxWidth = "120px";
      spriteCanvas.style.maxHeight = "80px";
      spriteCanvas.style.display = "block";
    }
    spriteContainer.appendChild(spriteCanvas);

    card.innerHTML = `
            <h4>${ship.name}</h4>
            <div class="ship-class">${ship.shipClass.toUpperCase()}</div>
        `;

    // Insert sprite after the class name
    card.appendChild(spriteContainer);

    // Add stats HTML
    const statsDiv = document.createElement("div");
    statsDiv.className = "ship-stats";
    statsDiv.innerHTML = `
            <div class="ship-stat ${hullPercent < 50 ? "low" : ""}">
                <span>Hull:</span>
                <span class="value">${Math.floor(ship.hull)}/${ship.maxHull}</span>
            </div>
            <div class="ship-stat">
                <span>Shield:</span>
                <span class="value">${ship.maxShield}</span>
            </div>
            <div class="ship-stat">
                <span>Energy:</span>
                <span class="value">${ship.maxEnergy}</span>
            </div>
            <div class="ship-stat">
                <span>AP:</span>
                <span class="value">${ship.maxActionPoints}</span>
            </div>
            <div class="ship-stat">
                <span>Weapons:</span>
                <span class="value">${ship.weapons.length}</span>
            </div>
        `;
    card.appendChild(statsDiv);

    return card;
  }

  launchBattle() {
    // Create fleet from all owned ships
    const ownedShips = this.progression.ownedShips;

    if (!ownedShips || ownedShips.length === 0) {
      if (this.modal) {
        this.modal.alert(
          "No Ships",
          "Purchase at least one ship before launching into battle!",
        );
      }
      return;
    }

    const fleet = ownedShips.map((ownedShip, index) => {
      const preset = SHIP_PRESETS[ownedShip.shipClass];
      const ship = new Ship({
        ...preset,
        id: `player${index + 1}`,
        name: `${ownedShip.shipClass.charAt(0).toUpperCase() + ownedShip.shipClass.slice(1)} ${index + 1}`,
        position: new HexCoord(-5 + index * 2, index - 1),
        team: "player",
        hull: ownedShip.hull,
        maxHull: ownedShip.maxHull,
        upgrades: ownedShip.upgrades || [],
      });
      ship._ownedIndex = index;

      // Re-apply saved upgrades to ensure stats are correct in battle
      if (ownedShip.upgrades && ownedShip.upgrades.length > 0) {
        ownedShip.upgrades.forEach((upgradeKey) => {
          this.upgradeManager.applyUpgrade(ship, upgradeKey);
        });
      }

      return ship;
    });

    this.campaign.setFleet(fleet);

    // Show battle screen and start game
    this.showScreen("battle-screen");

    // Signal to app to start the battle
    if (window.app) {
      window.app.startBattle();
    }
  }

  showPostBattle(victory, battleSummary = null) {
    this.showScreen("post-battle-screen");
    this.currentBattleVictory = victory;
    this.currentBattleSummary = battleSummary;

    const resultEl = document.getElementById("battle-result");
    resultEl.textContent = victory ? "VICTORY!" : "DEFEAT";
    resultEl.className = victory ? "victory" : "defeat";

    const summaryEl = document.getElementById("post-battle-summary");
    if (battleSummary) {
      summaryEl.innerHTML =
        `Turns: <span>${battleSummary.turnsElapsed}</span> &nbsp;|&nbsp; ` +
        `Damage Dealt: <span>${Math.floor(battleSummary.damageDealt)}</span> &nbsp;|&nbsp; ` +
        `Damage Taken: <span>${Math.floor(battleSummary.damageTaken)}</span> &nbsp;|&nbsp; ` +
        `Abilities Used: <span>${battleSummary.abilitiesUsed}</span>`;
      summaryEl.classList.remove("hidden");
    } else {
      summaryEl.innerHTML = "";
      summaryEl.classList.add("hidden");
    }

    this.renderRewards(victory);
    this.renderFleetStatus();
    this.renderPostBattleEvent(victory);
  }

  renderRewards(victory) {
    if (!victory) {
      document.getElementById("rewards-list").innerHTML =
        '<p style="color: #ff4444;">Campaign Failed</p>';
      return;
    }

    const rewards = this.campaign.rewards;
    document.getElementById("rewards-list").innerHTML = `
            <div class="reward-item">
                Credits: <span class="value">+${rewards.credits}</span>
            </div>
            <div class="reward-item">
                Scrap: <span class="value">+${rewards.scrap}</span>
            </div>
        `;
  }

  renderFleetStatus() {
    const fleetStatus = this.campaign.getFleetStatus();
    const statusHtml = fleetStatus
      .map(
        (ship) => `
            <div class="fleet-status-item">
                <span>${ship.name}</span>
                <span style="color: ${ship.hullPercent < 50 ? "#ff4444" : "#44ff44"}">${ship.hullPercent}% Hull</span>
            </div>
        `,
      )
      .join("");

    document.getElementById("fleet-status").innerHTML = statusHtml;
  }

  renderPostBattleEvent(victory) {
    const eventWrapper = document.getElementById("post-battle-event");
    const titleEl = document.getElementById("event-title");
    const descriptionEl = document.getElementById("event-description");
    const choicesEl = document.getElementById("event-choices");
    const messageEl = document.getElementById("event-message");
    const continueBtn = document.getElementById("continue-campaign-btn");

    const eventData = victory ? this.campaign.pendingEvent : null;

    choicesEl.innerHTML = "";
    messageEl.textContent = "";

    if (eventData) {
      eventWrapper.classList.remove("hidden");
      titleEl.textContent = eventData.title;
      descriptionEl.textContent = eventData.description;
      continueBtn.disabled = true;

      eventData.choices.forEach((choice) => {
        const btn = document.createElement("button");
        btn.className = "event-choice-btn";
        let label = choice.label;
        if (choice.costCredits > 0) {
          label += ` (Cost: ${choice.costCredits}₡)`;
        }
        btn.textContent = label;
        btn.addEventListener("click", () => {
          this.handleEventChoice(choice.id, btn, messageEl, continueBtn);
        });
        choicesEl.appendChild(btn);
      });
    } else {
      eventWrapper.classList.add("hidden");
      continueBtn.disabled = false;
    }
  }

  handleEventChoice(choiceId, buttonEl, messageEl, continueBtn) {
    if (!this.campaign.pendingEvent) {
      return;
    }

    const result = this.campaign.resolvePendingEvent(choiceId);

    if (result.success) {
      messageEl.textContent = result.message;
      const buttons = document.querySelectorAll(
        "#event-choices .event-choice-btn",
      );
      buttons.forEach((btn) => {
        btn.disabled = true;
        btn.classList.add("disabled");
      });
      continueBtn.disabled = false;
      this.renderFleetStatus();
      this.renderRewards(this.currentBattleVictory);
    } else {
      messageEl.textContent = result.message;
    }
  }

  continueFromBattle() {
    // Show upgrade screen for surviving ships
    const fleet = this.campaign.getFleet();
    const survivingShips = fleet.filter((ship) => ship.hull > 0);

    if (survivingShips.length > 0) {
      this.showUpgradeScreen(survivingShips);
    } else {
      this.finishUpgrades();
    }
  }

  showUpgradeScreen(ships) {
    this.showScreen("upgrade-screen");
    this.selectedUpgrades.clear();

    const container = document.getElementById("upgrade-ships");
    container.innerHTML = "";

    ships.forEach((ship, shipIndex) => {
      const section = document.createElement("div");
      section.className = "upgrade-ship-section";

      // Header
      const header = document.createElement("div");
      header.className = "upgrade-ship-header";
      header.innerHTML = `
                <h3>${ship.name}</h3>
                <div class="upgrade-ship-stats">
                    ${ship.hull}/${ship.maxHull} HP | ${ship.maxActionPoints} AP | ${ship.reactorOutput} Energy/turn
                </div>
            `;
      section.appendChild(header);

      // Get 3 random upgrades
      const upgradeChoices = this.upgradeManager.getUpgradeChoices(ship, 3);

      const choicesDiv = document.createElement("div");
      choicesDiv.className = "upgrade-choices";

      upgradeChoices.forEach((upgrade) => {
        const card = document.createElement("div");
        card.className = "upgrade-card";
        card.innerHTML = `
                    <div class="upgrade-icon">${upgrade.icon}</div>
                    <div class="upgrade-name">${upgrade.name}</div>
                    <div class="upgrade-description">${upgrade.description}</div>
                `;

        card.addEventListener("click", () => {
          // Deselect other cards for this ship
          choicesDiv
            .querySelectorAll(".upgrade-card")
            .forEach((c) => c.classList.remove("selected"));
          card.classList.add("selected");

          // Save selection
          this.selectedUpgrades.set(ship.id, upgrade.key);

          if (this.sound) this.sound.playClick();
        });

        choicesDiv.appendChild(card);
      });

      section.appendChild(choicesDiv);
      container.appendChild(section);
    });
  }

  finishUpgrades() {
    // Apply selected upgrades
    const fleet = this.campaign.getFleet();

    this.selectedUpgrades.forEach((upgradeKey, shipId) => {
      const ship = fleet.find((s) => s.id === shipId);
      if (ship) {
        this.upgradeManager.applyUpgrade(ship, upgradeKey);
      }
    });

    // Persist upgrades back to campaign + progression
    this.campaign.syncFleetToProgression();
    this.campaign.setFleet(fleet);

    // Continue with campaign
    const hasNext = this.campaign.nextBattle();

    if (hasNext) {
      // Go back to shipyard for repairs
      this.showShipyard();
    } else {
      // Campaign complete!
      if (this.modal) {
        this.modal
          .alert(
            "Campaign Complete!",
            "Congratulations, Commander! You have achieved total victory!",
          )
          .then(() => {
            this.campaign.reset();
            this.showScreen("main-menu");
            this.updateMainMenu();
          });
      } else {
        this.campaign.reset();
        this.showScreen("main-menu");
        this.updateMainMenu();
      }
    }
  }

  async abandonCampaign() {
    if (this.modal) {
      const confirmed = await this.modal.confirm(
        "Abandon Campaign?",
        "Are you sure you want to abandon this campaign? All progress will be lost.",
      );
      if (confirmed) {
        this.campaign.abandonCampaign();
        this.showScreen("main-menu");
        this.updateMainMenu();
      }
    } else {
      if (confirm("Are you sure you want to abandon this campaign?")) {
        this.campaign.abandonCampaign();
        this.showScreen("main-menu");
        this.updateMainMenu();
      }
    }
  }
}

window.MenuManager = MenuManager;
