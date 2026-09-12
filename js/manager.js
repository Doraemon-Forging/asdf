/**
 * MANAGER.JS
 * Handles multi-profile saving, loading, migration, UI rendering, and reordering.
 */

const ProfileManager = {
    storageKey: 'techPlannerProfiles',
    legacyKey: 'techPlannerData',
    state: { active: null, profiles: {} },
    expandedProfileId: null, 

    init() {
        const preloadIcons = ['icons/accedit.png', 'icons/accdelete.png', 'icons/accadd.png'];
        preloadIcons.forEach(src => { const img = new Image(); img.src = src; });

        const savedProfiles = localStorage.getItem(this.storageKey);
        if (savedProfiles) {
            this.state = JSON.parse(savedProfiles);
        } else {
            const legacySave = localStorage.getItem(this.legacyKey);
            const id = 'profile_' + Date.now();
            this.state = {
                active: id,
                profiles: {
                    [id]: {
                        name: 'Main Account',
                        data: legacySave ? JSON.parse(legacySave) : null
                    }
                }
            };
            this.saveToStorage();
        }
        return this.getActiveData();
    },

    getActiveData() {
        if (this.state.active && this.state.profiles[this.state.active]) {
            return this.state.profiles[this.state.active].data;
        }
        return null;
    },

    saveCurrent(data) {
        if (!this.state.active) return;
        if (!this.state.profiles[this.state.active]) {
            this.state.profiles[this.state.active] = { name: 'Main Account', data: null };
        }
        this.state.profiles[this.state.active].data = data;
        this.saveToStorage();
    },

    saveToStorage() {
        localStorage.setItem(this.storageKey, JSON.stringify(this.state));
    },

    switchProfile(id, skipSave = false) {

        const wasExpanded = this.expandedProfileId !== null;
        this.expandedProfileId = null; 

        if (id === this.state.active || !this.state.profiles[id]) {
            if (wasExpanded) this.renderModal(); 
            return;
        }

        if (typeof saveTimeout !== 'undefined') {
            clearTimeout(saveTimeout);
        }

        if (!skipSave && typeof captureFullState === 'function') {
            this.saveCurrent(captureFullState());
        }
        this.state.active = id;
        this.saveToStorage();

        window.location.reload();
    },

    createProfile(name) {
        if (!name.trim()) return;
        const id = 'profile_' + Date.now();
        this.state.profiles[id] = { name: name.trim(), data: null };
        this.switchProfile(id);
    },

    renameProfile(id, newName) {
        if (!newName.trim() || !this.state.profiles[id]) return;
        this.state.profiles[id].name = newName.trim();
        this.saveToStorage();
        this.renderModal();
    },

    deleteProfile(id) {
        if (Object.keys(this.state.profiles).length <= 1) {
            alert("You cannot delete your only account.");
            return;
        }
        
        if (confirm(`Are you sure you want to delete ${this.state.profiles[id].name}?`)) {
            const isDeletingActive = (this.state.active === id);

            delete this.state.profiles[id];
            if (this.expandedProfileId === id) this.expandedProfileId = null;
            
            if (isDeletingActive) {
                const fallbackId = Object.keys(this.state.profiles)[0];
                this.switchProfile(fallbackId, true); 
            } else {
                this.saveToStorage();
                this.renderModal();
            }
        }
    },

    toggleProfileMenu(id) {
        this.expandedProfileId = (this.expandedProfileId === id) ? null : id;
        this.renderModal();
    },

    moveProfile(id, direction) {
        const entries = Object.entries(this.state.profiles);
        const idx = entries.findIndex(e => e[0] === id);
        if (idx === -1) return;

        if (direction === 'up' && idx > 0) {
            const temp = entries[idx - 1];
            entries[idx - 1] = entries[idx];
            entries[idx] = temp;
        } else if (direction === 'down' && idx < entries.length - 1) {
            const temp = entries[idx + 1];
            entries[idx + 1] = entries[idx];
            entries[idx] = temp;
        } else {
            return;
        }

        this.state.profiles = Object.fromEntries(entries);
        this.saveToStorage();
        this.renderModal();
    },

    openModal() {
        this.expandedProfileId = null;
        this.renderModal();
    },

    closeModal() {
        const modal = document.getElementById('tableModal');
        if (modal) modal.style.display = 'none';
    },

    renderModal() {
        if (typeof MODAL_SETTINGS !== 'undefined' && !MODAL_SETTINGS.accountManager) {
            MODAL_SETTINGS.accountManager = {
                title: "ACCOUNT MANAGER",
                headerColor: "#ebf8fa",
                titleColor: "#000000",
                disclaimer: ""
            };
        }

        const textFormat = `font-family: 'Fredoka', sans-serif !important; font-size: 1rem !important; color: #000000 !important; -webkit-text-stroke: 0px transparent !important; text-shadow: none !important; font-weight: 600 !important; letter-spacing: 0.5px;`;
        
        const gearBtnStyle = `padding: 6px 12px; border-radius: 8px; border: 2px solid #000; background-color: #00b0ff; cursor: pointer; box-shadow: inset 0 -3px 0 #005680; display: flex; align-items: center; justify-content: center; transition: transform 0.1s;`;
        const addBtnStyle = `padding: 8px 14px; border-radius: 8px; border: 2px solid #000; background-color: #00b0ff; cursor: pointer; box-shadow: inset 0 -3px 0 #005680; display: flex; align-items: center; justify-content: center; transition: transform 0.1s;`;

        let listHtml = '<div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px;">';
        
        const profileKeys = Object.keys(this.state.profiles);

        profileKeys.forEach((id, index) => {
            const p = this.state.profiles[id];
            const isActive = id === this.state.active;
            const isExpanded = id === this.expandedProfileId;
            
            const bg = isActive ? '#ccf0ff' : '#f2f2f2'; 
            const borderStyle = isActive ? 'border: 2px solid #00b0ff;' : 'border: 2px solid transparent;';
            const iconHtml = isActive ? `<span style="color: #00b0ff; font-size: 1.1rem; margin-right: 8px; -webkit-text-stroke: 0px;">▶</span>` : '';
            
            listHtml += `
                <div style="display: flex; flex-direction: column; padding: 10px 15px; border-radius: 8px; background-color: ${bg}; ${borderStyle}">
                    
                    <!-- Main Row -->
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div style="flex-grow: 1; ${textFormat} cursor: pointer; display: flex; align-items: center;" onclick="ProfileManager.switchProfile('${id}')">
                            ${iconHtml}${p.name}
                        </div>
                        <div>
                            <button onclick="ProfileManager.toggleProfileMenu('${id}')" style="${gearBtnStyle}" onmousedown="this.style.transform='translateY(2px)'; this.style.boxShadow='inset 0 -1px 0 #005680';" onmouseup="this.style.transform='translateY(0)'; this.style.boxShadow='inset 0 -3px 0 #005680';" onmouseleave="this.style.transform='translateY(0)'; this.style.boxShadow='inset 0 -3px 0 #005680';" title="Options">
                                <img src="icons/accedit.png" style="width: 20px; height: 20px; object-fit: contain;">
                            </button>
                        </div>
                    </div>
            `;

            if (isExpanded) {
                const disableUp = (index === 0);
                const disableDown = (index === profileKeys.length - 1);
                const disableDelete = (profileKeys.length === 1);

                listHtml += `
                    <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 5px; margin-top: 10px; padding-top: 10px; border-top: 1px dashed rgba(0,0,0,0.1);">
                        <button class="btn-game-ctrl btn-move" onclick="ProfileManager.moveProfile('${id}', 'up')" ${disableUp ? 'style="opacity:0.4; pointer-events:none;"' : ''}>UP</button>
                        <button class="btn-game-ctrl btn-insert" onclick="ProfileManager.moveProfile('${id}', 'down')" ${disableDown ? 'style="opacity:0.4; pointer-events:none;"' : ''}>DOWN</button>
                        <button class="btn-game-ctrl btn-done" onclick="const n = prompt('New name:', '${p.name}'); if(n) ProfileManager.renameProfile('${id}', n)">RENAME</button>
                        <button class="btn-game-ctrl btn-del" onclick="ProfileManager.deleteProfile('${id}')" ${disableDelete ? 'style="opacity:0.4; pointer-events:none;"' : ''}>DELETE</button>
                    </div>
                `;
            }

            listHtml += `</div>`; 
        });
        
        listHtml += '</div>';

        const bodyContentHTML = `
            ${listHtml}
            <div style="display: flex; gap: 10px; align-items: center; margin-top: 10px;">
                <input type="text" id="new-account-name" placeholder="New Account Name" style="flex-grow: 1; padding: 10px 15px; border-radius: 8px; border: 2px solid #000; font-family: 'Fredoka', sans-serif; font-weight: 600; font-size: 1rem; outline: none; background-color: #ffffff; color: #000; box-shadow: inset 0 2px 4px rgba(0,0,0,0.05); -webkit-text-stroke: 0px transparent;">
                <button onclick="ProfileManager.createProfile(document.getElementById('new-account-name').value)" style="${addBtnStyle}" onmousedown="this.style.transform='translateY(2px)'; this.style.boxShadow='inset 0 -1px 0 #005680';" onmouseup="this.style.transform='translateY(0)'; this.style.boxShadow='inset 0 -3px 0 #005680';" onmouseleave="this.style.transform='translateY(0)'; this.style.boxShadow='inset 0 -3px 0 #005680';">
                    <img src="icons/accadd.png" style="width: 24px; height: 24px; object-fit: contain;">
                </button>
            </div>
        `;

        if (typeof renderMasterModal === 'function') {
            renderMasterModal('accountManager', bodyContentHTML);
        }
    }
};