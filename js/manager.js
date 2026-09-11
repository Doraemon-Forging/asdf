/**
 * MANAGER.JS
 * Handles multi-profile saving, loading, migration, and UI rendering.
 */

const ProfileManager = {
    storageKey: 'techPlannerProfiles',
    legacyKey: 'techPlannerData',
    state: { active: null, profiles: {} },

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
        if (id === this.state.active || !this.state.profiles[id]) return;

        // FIX: Clear pending save timer to prevent cross-account contamination (Race Condition)
        if (typeof saveTimeout !== 'undefined') {
            clearTimeout(saveTimeout);
        }

        if (!skipSave && typeof captureFullState === 'function') {
            this.saveCurrent(captureFullState());
        }

        this.state.active = id;
        this.saveToStorage();
        
        if (typeof setupLevels !== 'undefined') Object.keys(setupLevels).forEach(k => delete setupLevels[k]);
        if (typeof planQueue !== 'undefined') planQueue.length = 0;
        if (typeof eggPlanQueue !== 'undefined') eggPlanQueue.length = 0;

        const newData = this.getActiveData();
        
        if (newData && typeof loadState === 'function') {
            loadState(newData);
        } else {
            // Handle switching to a brand new profile
            const nowIso = new Date().toISOString().slice(0, 16);
            if (typeof safeSetVal === 'function') {
                safeSetVal('start-date', nowIso); 
                safeSetVal('calc-start-date', nowIso); 
                safeSetVal('egg-date-desktop', nowIso);
            }
            if (typeof updateCalculations === 'function') updateCalculations(); 
            if (typeof updateDaily === 'function') updateDaily(); 
            if (typeof updateWeekly === 'function') updateWeekly();
            if (typeof updateWarCalc === 'function') updateWarCalc();
        }

        this.closeModal();
        
        if (typeof activeTreeKey !== 'undefined' && typeof switchTree === 'function') {
            switchTree(activeTreeKey);
        }
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
            
            if (isDeletingActive) {
                const fallbackId = Object.keys(this.state.profiles)[0];
                this.switchProfile(fallbackId, true); 
            } else {
                this.saveToStorage();
                this.renderModal();
            }
        }
    },

    openModal() {
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
        
        const blueBtnStyle = `padding: 6px 12px; border-radius: 8px; border: 2px solid #000; background-color: #00b0ff; cursor: pointer; box-shadow: inset 0 -3px 0 #005680; display: flex; align-items: center; justify-content: center; transition: transform 0.1s;`;
        const redBtnStyle = `padding: 6px 12px; border-radius: 8px; border: 2px solid #000; background-color: #ff4757; cursor: pointer; box-shadow: inset 0 -3px 0 #c0392b; display: flex; align-items: center; justify-content: center; transition: transform 0.1s;`;
        const addBtnStyle = `padding: 8px 14px; border-radius: 8px; border: 2px solid #000; background-color: #00b0ff; cursor: pointer; box-shadow: inset 0 -3px 0 #005680; display: flex; align-items: center; justify-content: center; transition: transform 0.1s;`;

        let listHtml = '<div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px;">';
        
        Object.keys(this.state.profiles).forEach(id => {
            const p = this.state.profiles[id];
            const isActive = id === this.state.active;
            
            const bg = isActive ? '#ccf0ff' : '#f2f2f2'; 
            const borderStyle = isActive ? 'border: 2px solid #00b0ff;' : 'border: 2px solid transparent;';
            const iconHtml = isActive ? `<span style="color: #00b0ff; font-size: 1.1rem; margin-right: 8px; -webkit-text-stroke: 0px;">▶</span>` : '';
            
            listHtml += `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 15px; border-radius: 8px; background-color: ${bg}; ${borderStyle}">
                    <div style="flex-grow: 1; ${textFormat} cursor: pointer; display: flex; align-items: center;" onclick="ProfileManager.switchProfile('${id}')">
                        ${iconHtml}${p.name}
                    </div>
                    <div style="display: flex; gap: 8px;">
                        <button onclick="const n = prompt('New name:', '${p.name}'); if(n) ProfileManager.renameProfile('${id}', n)" style="${blueBtnStyle}" onmousedown="this.style.transform='translateY(2px)'; this.style.boxShadow='inset 0 -1px 0 #005680';" onmouseup="this.style.transform='translateY(0)'; this.style.boxShadow='inset 0 -3px 0 #005680';" onmouseleave="this.style.transform='translateY(0)'; this.style.boxShadow='inset 0 -3px 0 #005680';" title="Edit Name">
                            <img src="icons/accedit.png" style="width: 20px; height: 20px; object-fit: contain;">
                        </button>
                        <button onclick="ProfileManager.deleteProfile('${id}')" style="${redBtnStyle} ${Object.keys(this.state.profiles).length === 1 ? 'opacity: 0.5; cursor: not-allowed;' : ''}" onmousedown="this.style.transform='translateY(2px)'; this.style.boxShadow='inset 0 -1px 0 #c0392b';" onmouseup="this.style.transform='translateY(0)'; this.style.boxShadow='inset 0 -3px 0 #c0392b';" onmouseleave="this.style.transform='translateY(0)'; this.style.boxShadow='inset 0 -3px 0 #c0392b';" title="Delete" ${Object.keys(this.state.profiles).length === 1 ? 'disabled' : ''}>
                            <img src="icons/accdelete.png" style="width: 20px; height: 20px; object-fit: contain;">
                        </button>
                    </div>
                </div>
            `;
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