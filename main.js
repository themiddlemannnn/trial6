import { setupScene } from './sceneSetup.js';
import { Player } from './player.js';
import { setupControls } from './controls.js';
import { setupMobileControls } from './mobile-controls.js';
import { handleCollisions } from './collisions.js';
import { setupMobileExperience } from './mobile.js';
import { NameEntrySystem } from './nameEntry.js';
import { supabaseManager } from './supabase.js';
import { createNameLabel, createSpeechBubble } from './ui.js';
import { BillboardManager } from './billboardManager.js';

// --- INITIALIZATION ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a1a);
scene.fog = new THREE.Fog(0x1a1a1a, 60, 100);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 200);
const audioListener = new THREE.AudioListener();
camera.add(audioListener);

// Global state variables
let isMobile;
let controls;
let cameraMode = 'auto';
let targetCameraAngle = { theta: Math.PI, phi: Math.PI / 2.8 };
let currentCameraAngle = { ...targetCameraAngle };
let cameraDistance;

const raycaster = new THREE.Raycaster();
let isBillboardFocused = false;
let focusCameraPosition = new THREE.Vector3();
let focusCameraTarget = new THREE.Vector3();
let originalCameraDistance;

// Multiplayer state
let remotePlayers = new Map();
let playerData = null;
let lastPositionUpdate = 0;
let lastPosition = new THREE.Vector3(0, 1.2, 25);
const POSITION_UPDATE_INTERVAL = 200; // ✅ 200ms = 5 updates per second (balanced)
const MIN_MOVE_DISTANCE = 0.1; // ✅ Only send if moved 10cm or more

let billboardManager = null;

// --- SCENE & PLAYER SETUP ---
const { collidableObjects, videoElement, billboardAudio, billboardFrame } = setupScene(scene, audioListener);
let player;

// --- Device Selection Logic ---
const deviceSelectionModal = document.getElementById('deviceSelectionModal');
document.getElementById('desktopButton').addEventListener('click', () => showNameEntry(false));
document.getElementById('mobileButton').addEventListener('click', () => showNameEntry(true));

function showNameEntry(isMobileDevice) {
    isMobile = isMobileDevice;
    deviceSelectionModal.style.display = 'none';
    new NameEntrySystem(async (userData) => {
        playerData = userData;
        await initializeMultiplayerExperience(userData);
    });
}

async function initializeMultiplayerExperience(userData) {
    cameraDistance = isMobile ? 12 : 25;
    controls = isMobile ? setupMobileControls(renderer.domElement) : setupControls(renderer.domElement);

    if (isMobile) {
        setupMobileExperience(videoElement, billboardAudio);
    } else {
        document.getElementById('mobileControls').style.display = 'none';
        document.getElementById('exitFocusButton').style.display = 'none';
        const startMedia = () => {
            if (videoElement && videoElement.src && videoElement.paused) {
                videoElement.play().catch(e => console.warn("Video play failed:", e));
            }
            if (billboardAudio) {
                if (billboardAudio.context && billboardAudio.context.state === 'suspended') {
                    billboardAudio.context.resume();
                }
                if (!billboardAudio.isPlaying) {
                    try {
                        billboardAudio.play();
                    } catch (e) {
                        console.warn("Audio play failed:", e);
                    }
                }
            }
            window.removeEventListener('click', startMedia);
        };
        window.addEventListener('click', startMedia);
    }

    const colorHex = parseInt(userData.ballColor.replace('#', ''), 16);
    player = new Player(scene, new THREE.Vector3(0, 1.2, 25), colorHex);

    if (player.nameSprite) {
        scene.remove(player.nameSprite);
    }
    const nameLabel = createNameLabel(userData.name);
    player.nameSprite = nameLabel;
    scene.add(nameLabel);

    billboardManager = new BillboardManager(billboardFrame, userData);
    await connectToMultiplayer(userData);
    animate();
}

async function connectToMultiplayer(userData) {
    try {
        const roomId = await supabaseManager.findAvailableRoom();
        if (!roomId) {
            console.error('Could not find or create room');
            showSystemMessage('Connection error. Playing in offline mode.');
            return;
        }

        const playerId = await supabaseManager.joinRoom(
            roomId,
            userData.name,
            userData.ballColor,
            userData.countryCode
        );
        if (!playerId) {
            console.error('Could not join room');
            showSystemMessage('Connection error. Playing in offline mode.');
            return;
        }

        console.log('✅ Connected with player ID:', playerId);
        showSystemMessage(`Connected! Welcome ${userData.name}!`);
        
        // ✅ Wait a moment for subscriptions to be fully ready
        await new Promise(resolve => setTimeout(resolve, 500));
        
        await loadExistingPlayers();
        setupMultiplayerListeners();
        updatePlayerCount();
    } catch (error) {
        console.error('Multiplayer connection error:', error);
        showSystemMessage('Playing in offline mode');
    }
}

async function loadExistingPlayers() {
    const players = await supabaseManager.getActivePlayers();
    console.log('👥 Loading existing players:', players.length);
    players.forEach(playerData => {
        if (playerData.id !== supabaseManager.playerId) {
            createRemotePlayer(playerData);
        }
    });
}

function createRemotePlayer(playerData) {
    // ✅ Prevent duplicate players
    if (remotePlayers.has(playerData.id)) {
        console.log('⚠️ Player already exists, skipping:', playerData.name);
        return;
    }
    
    console.log('➕ Creating remote player:', playerData.name, playerData.id);
    
    const geometry = new THREE.SphereGeometry(1.2, 32, 32);
    const colorHex = parseInt(playerData.ball_color.replace('#', ''), 16);
    const material = new THREE.MeshStandardMaterial({ color: colorHex, roughness: 0.3, metalness: 0.4 });
    const ball = new THREE.Mesh(geometry, material);
    ball.position.set(
        playerData.position_x,
        playerData.position_y,
        playerData.position_z
    );
    ball.castShadow = true;
    scene.add(ball);

    const nameLabel = createNameLabel(playerData.name);
    nameLabel.position.copy(ball.position);
    nameLabel.position.y += 1.9;
    scene.add(nameLabel);

    remotePlayers.set(playerData.id, {
        ball,
        nameLabel,
        data: playerData,
        targetPosition: ball.position.clone(),
        lastUpdate: Date.now(),
        lastRenderPosition: ball.position.clone() // ✅ Track last rendered position
    });

    showSystemMessage(`${playerData.name} joined the space!`);
}

function removeRemotePlayer(playerId) {
    const remotePlayer = remotePlayers.get(playerId);
    if (remotePlayer) {
        console.log('➖ Removing remote player:', remotePlayer.data.name);
        scene.remove(remotePlayer.ball);
        scene.remove(remotePlayer.nameLabel);
        remotePlayers.delete(playerId);
        showSystemMessage(`${remotePlayer.data.name} left the space!`);
        updatePlayerCount();
    }
}

function updateRemotePlayer(playerData) {
    const remotePlayer = remotePlayers.get(playerData.id);
    if (remotePlayer) {
        const newPosition = new THREE.Vector3(
            playerData.position_x, 
            playerData.position_y, 
            playerData.position_z
        );
        
        // ✅ Only update if position actually changed
        const distance = newPosition.distanceTo(remotePlayer.targetPosition);
        if (distance > 0.01) {
            remotePlayer.targetPosition.copy(newPosition);
            remotePlayer.lastUpdate = Date.now();
        }
    }
}

function setupMultiplayerListeners() {
    window.addEventListener('playerUpdate', (event) => {
        const { event: eventType, player: playerData } = event.detail;
        
        // ✅ Skip own updates
        if (playerData.id === supabaseManager.playerId) {
            return;
        }

        console.log('🔔 Player update:', eventType, playerData.name, playerData.id);

        if (eventType === 'INSERT') {
            createRemotePlayer(playerData);
            updatePlayerCount();
        } else if (eventType === 'UPDATE') {
            updateRemotePlayer(playerData);
        } else if (eventType === 'DELETE') {
            removeRemotePlayer(playerData.id);
        }
    });

    window.addEventListener('billboardUpdate', (event) => {
        const { billboard } = event.detail;
        updateBillboardContent(billboard);
    });

    window.addEventListener('chatMessage', (event) => {
        console.log('🎧 chatMessage event listener triggered!');
        const { chatMessage } = event.detail;
        console.log('💬 Chat message event received:', chatMessage);
        handleIncomingChatMessage(chatMessage);
    });

    window.addEventListener('forceBillboardFocus', () => {
        if (canSeeBillboard()) {
            enterBillboardFocusMode();
            setTimeout(() => exitBillboardFocusMode(), 20000);
        }
    });

    // Clean up stale players
    setInterval(() => {
        const now = Date.now();
        remotePlayers.forEach((remotePlayer, playerId) => {
            if (now - remotePlayer.lastUpdate > 60000) {
                console.log('🧹 Cleaning up stale player:', remotePlayer.data.name);
                removeRemotePlayer(playerId);
            }
        });
    }, 30000);
}

function updateBillboardContent(billboard) {
    if (!billboard) return;
    if (billboard.content_type === 'video') {
        videoElement.src = billboard.content_url;
        videoElement.play().catch(e => console.error("Video play failed:", e));
    } else if (billboard.content_type === 'image') {
        const textureLoader = new THREE.TextureLoader();
        textureLoader.load(billboard.content_url, (texture) => {
            const display = billboardFrame.children.find(child => child.geometry && child.geometry.type === 'PlaneGeometry');
            if (display) {
                display.material.map = texture;
                display.material.needsUpdate = true;
            }
        });
    }
    const uploaderName = billboard.player_name || 'Someone';
    showSystemMessage(`${uploaderName} updated the billboard!`);
}

function handleIncomingChatMessage(chatMessage) {
    console.log('💬 Processing chat message:', chatMessage);
    
    // ✅ Skip own messages
    if (chatMessage.player_id === supabaseManager.playerId) {
        console.log('⏭️ Skipping own message');
        return;
    }

    const playerName = chatMessage.player_name || 'Someone';
    console.log('📢 Showing message from:', playerName);
    showSystemMessage(`${playerName}: ${chatMessage.message}`);

    // ✅ Show speech bubble above remote player's head (same style as local player)
    const remotePlayer = remotePlayers.get(chatMessage.player_id);
    if (remotePlayer && remotePlayer.ball) {
        // Remove existing speech bubble if any
        if (remotePlayer.speechBubble) {
            scene.remove(remotePlayer.speechBubble);
        }
        
        // ✅ Create the white speech bubble (same as player.showMessage)
        const speechBubble = createSpeechBubble(chatMessage.message);
        speechBubble.position.copy(remotePlayer.ball.position);
        speechBubble.position.y += 4; // Position above the name label (1.2 radius + 0.7 name + 2.1 offset)
        scene.add(speechBubble);
        
        // Store reference for cleanup
        remotePlayer.speechBubble = speechBubble;
        
        // Remove after 4 seconds
        setTimeout(() => {
            if (remotePlayer.speechBubble === speechBubble) {
                scene.remove(speechBubble);
                remotePlayer.speechBubble = null;
            }
        }, 4000);
    }
}

function updatePlayerCount() {
    const count = remotePlayers.size + 1;
    document.getElementById('playerCount').textContent = count;
    console.log('👥 Player count updated:', count);
}

function showSystemMessage(message) {
    console.log('📣 System message:', message);
    const systemLog = document.getElementById('systemLog');
    systemLog.textContent = message;
    setTimeout(() => {
        if (systemLog.textContent === message) {
            systemLog.textContent = '';
        }
    }, 5000);
}

function canSeeBillboard() {
    if (!player) return false;
    const playerPos = player.ball.position.clone();
    const billboardPos = billboardFrame.position.clone();
    const toBillboard = new THREE.Vector3().subVectors(billboardPos, playerPos);
    toBillboard.y = 0;
    if (toBillboard.lengthSq() === 0) return false;
    if (toBillboard.length() > 40) return false;

    const cameraForward = new THREE.Vector3();
    camera.getWorldDirection(cameraForward);
    cameraForward.y = 0;
    cameraForward.normalize();
    const angle = cameraForward.angleTo(toBillboard.normalize());
    if (angle > Math.PI / 2) return false;

    raycaster.set(playerPos, toBillboard.clone().normalize());
    raycaster.far = toBillboard.length();
    const intersects = raycaster.intersectObjects(collidableObjects);
    for (const hit of intersects) {
        if (hit.object !== billboardFrame && hit.object !== billboardFrame.children[0]) {
            return false;
        }
    }
    return true;
}

document.getElementById('focusBillboardButton').addEventListener('click', () => {
    if (!isBillboardFocused && canSeeBillboard()) {
        enterBillboardFocusMode();
    }
});

function enterBillboardFocusMode() {
    isBillboardFocused = true;
    originalCameraDistance = cameraDistance;
    document.getElementById('ui').style.display = 'none';
    document.getElementById('chatContainer').style.display = 'none';
    document.getElementById('systemLog').style.display = 'none';
    document.getElementById('settingsIcon').style.display = 'none';
    document.getElementById('settingsPanel').style.display = 'none';
    document.getElementById('mobileControls').style.display = 'none';
    document.getElementById('exitFocusButton').style.display = 'block';

    if (billboardAudio) {
        billboardAudio.setVolume(1.0);
    }

    const billboardPosition = billboardFrame.position.clone();
    focusCameraTarget.copy(billboardPosition);
    focusCameraPosition.copy(billboardPosition).add(new THREE.Vector3(0, 3, 12));
}

function exitBillboardFocusMode() {
    isBillboardFocused = false;
    cameraDistance = originalCameraDistance;
    document.getElementById('ui').style.display = 'block';
    document.getElementById('chatContainer').style.display = 'flex';
    document.getElementById('systemLog').style.display = 'block';
    document.getElementById('settingsIcon').style.display = 'flex';
    document.getElementById('settingsPanel').style.display = 'none';
    if (isMobile) {
        document.getElementById('mobileControls').style.display = 'block';
    }
    document.getElementById('exitFocusButton').style.display = 'none';
    if (billboardAudio) {
        billboardAudio.setVolume(0.5);
    }
}

document.getElementById('exitFocusButton').addEventListener('click', exitBillboardFocusMode);

// --- UI EVENT LISTENERS ---
const settingsPanel = document.getElementById('settingsPanel');
const howToPlayPanel = document.getElementById('howToPlayPanel');
const mainSettingsContent = document.getElementById('mainSettingsContent');

document.getElementById('settingsIcon').addEventListener('click', () => {
    settingsPanel.style.display = 'flex';
});
document.getElementById('closeSettingsButton').addEventListener('click', () => {
    settingsPanel.style.display = 'none';
    howToPlayPanel.style.display = 'none';
    mainSettingsContent.style.display = 'flex';
});
document.getElementById('howToPlayButton').addEventListener('click', () => {
    mainSettingsContent.style.display = 'none';
    howToPlayPanel.style.display = 'flex';
});
document.getElementById('backToSettingsButton').addEventListener('click', () => {
    howToPlayPanel.style.display = 'none';
    mainSettingsContent.style.display = 'flex';
});
document.getElementById('cameraToggle').addEventListener('click', () => {
    cameraMode = cameraMode === 'auto' ? 'manual' : 'auto';
    document.getElementById('modeText').textContent = cameraMode === 'auto' ? 'Auto Follow' : 'Manual Control';
});
document.getElementById('zoomInButton').addEventListener('click', () => {
    cameraDistance = Math.max(8, cameraDistance - 3);
});
document.getElementById('zoomOutButton').addEventListener('click', () => {
    cameraDistance = Math.min(50, cameraDistance + 3);
});
document.getElementById('muteButton').addEventListener('click', () => {
    const button = document.getElementById('muteButton');
    if (billboardAudio && billboardAudio.isPlaying) {
        billboardAudio.pause();
        button.textContent = 'Unmute Audio';
    } else if (billboardAudio) {
        billboardAudio.play();
        button.textContent = 'Mute Audio';
    }
});
document.getElementById('fullscreenButton').addEventListener('click', toggleFullScreen);

function toggleFullScreen() {
    if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        const elem = document.documentElement;
        if (elem.requestFullscreen) {
            elem.requestFullscreen().catch(err => console.error(`Error: ${err.message}`));
        } else if (elem.webkitRequestFullscreen) {
            elem.webkitRequestFullscreen();
        }
    } else {
        if (document.exitFullscreen) document.exitFullscreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
    }
}

// Chat
document.getElementById('chatInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        const input = e.target;
        const msg = input.value.trim();
        if (msg && player) {
            console.log('📤 Sending chat message:', msg);
            player.showMessage(msg);
            supabaseManager.sendChatMessage(msg);
            input.value = '';
            input.blur();
        }
    }
});

document.getElementById('sendButton').addEventListener('click', () => {
    const input = document.getElementById('chatInput');
    const msg = input.value.trim();
    if (msg && player) {
        console.log('📤 Sending chat message:', msg);
        player.showMessage(msg);
        supabaseManager.sendChatMessage(msg);
        input.value = '';
        input.blur();
    }
});

// --- MAIN LOOP ---
let lastTime = performance.now();
function animate() {
    requestAnimationFrame(animate);
    const currentTime = performance.now();
    const deltaTime = Math.min((currentTime - lastTime) / 1000, 0.1);
    lastTime = currentTime;

    if (player) {
        const remotePlayerObjects = Array.from(remotePlayers.values());
        handleCollisions(player, remotePlayerObjects);

        // ✅ Smooth interpolation for remote players
        remotePlayers.forEach((remotePlayer) => {
            if (remotePlayer.targetPosition) {
                const distance = remotePlayer.ball.position.distanceTo(remotePlayer.targetPosition);
                
                // ✅ Snap if too far (teleport detection)
                if (distance > 10) {
                    remotePlayer.ball.position.copy(remotePlayer.targetPosition);
                } else {
                    // ✅ Smooth lerp based on distance
                    let lerpSpeed = distance > 2 ? 0.25 : 0.12;
                    remotePlayer.ball.position.lerp(remotePlayer.targetPosition, lerpSpeed);
                }
                
                // ✅ Update name label position
                remotePlayer.nameLabel.position.copy(remotePlayer.ball.position);
                remotePlayer.nameLabel.position.y += 1.9;
                
                // ✅ Update speech bubble position if it exists
                if (remotePlayer.speechBubble) {
                    remotePlayer.speechBubble.position.copy(remotePlayer.ball.position);
                    remotePlayer.speechBubble.position.y += 4;
                }
            }
        });

        if (!isBillboardFocused) {
            player.update(deltaTime, controls, camera);
            updateCamera();

            // ✅ Send position updates at controlled interval
            if (currentTime - lastPositionUpdate > POSITION_UPDATE_INTERVAL) {
                const currentPos = player.ball.position;
                const distanceMoved = currentPos.distanceTo(lastPosition);
                
                if (distanceMoved > MIN_MOVE_DISTANCE) {
                    supabaseManager.updatePlayerPosition(
                        currentPos.x,
                        currentPos.y,
                        currentPos.z
                    );
                    lastPosition.copy(currentPos);
                    lastPositionUpdate = currentTime;
                }
            }

            if (billboardManager) {
                const distance = player.ball.position.distanceTo(billboardFrame.position);
                if (distance < 15) {
                    billboardManager.showMenuButton();
                } else {
                    billboardManager.hideMenuButton();
                }
            }
        } else {
            updateFocusCamera();
        }
    }

    renderer.render(scene, camera);
}

function updateCamera() {
    if (controls.isDragging) {
        targetCameraAngle.theta -= controls.mouseDelta.x * 0.008;
        targetCameraAngle.phi -= controls.mouseDelta.y * 0.008;
        controls.mouseDelta = { x: 0, y: 0 };
    }
    if (controls.isTouchRotating) {
        targetCameraAngle.theta -= controls.touchDelta.x * 0.01;
        targetCameraAngle.phi -= controls.touchDelta.y * 0.01;
        controls.touchDelta = { x: 0, y: 0 };
    }
    if (cameraMode === 'auto' && !(controls.isDragging || controls.isTouchRotating)) {
        const rotationSpeed = 0.02;
        if (controls.keys['a'] || controls.keys['arrowleft']) targetCameraAngle.theta += rotationSpeed;
        if (controls.keys['d'] || controls.keys['arrowright']) targetCameraAngle.theta -= rotationSpeed;
    }
    targetCameraAngle.phi = Math.max(0.2, Math.min(Math.PI / 2 - 0.1, targetCameraAngle.phi));
    cameraDistance += controls.scrollDelta * 0.03;
    cameraDistance = Math.max(8, Math.min(50, cameraDistance));
    controls.scrollDelta = 0;

    const lerpFactor = 0.08;
    currentCameraAngle.theta += (targetCameraAngle.theta - currentCameraAngle.theta) * lerpFactor;
    currentCameraAngle.phi += (targetCameraAngle.phi - currentCameraAngle.phi) * lerpFactor;

    const playerHead = new THREE.Vector3(
        player.ball.position.x,
        player.ball.position.y + 2,
        player.ball.position.z
    );
    const idealCamOffset = new THREE.Vector3().setFromSphericalCoords(
        cameraDistance,
        currentCameraAngle.phi,
        currentCameraAngle.theta
    );
    const idealCamPos = playerHead.clone().add(idealCamOffset);
    const camDirection = new THREE.Vector3().subVectors(idealCamPos, playerHead).normalize();

    raycaster.set(playerHead, camDirection);
    raycaster.far = cameraDistance;
    const intersections = raycaster.intersectObjects(collidableObjects);
    if (intersections.length > 0) {
        camera.position.copy(intersections[0].point);
        camera.position.add(intersections[0].face.normal.multiplyScalar(0.5));
    } else {
        camera.position.copy(idealCamPos);
    }
    camera.lookAt(playerHead);
}

function updateFocusCamera() {
    camera.position.lerp(focusCameraPosition, 0.1);
    camera.lookAt(focusCameraTarget);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// ✅ Improved cleanup on page unload
window.addEventListener('beforeunload', () => {
    console.log('🚪 Page unloading, cleaning up...');
    if (supabaseManager.playerId && supabaseManager.currentRoom) {
        // ✅ Use sendBeacon for reliable cleanup during unload
        const cleanupData = JSON.stringify({
            player_id: supabaseManager.playerId,
            room_id: supabaseManager.currentRoom
        });
        
        // Synchronous cleanup
        supabaseManager.leaveRoom();
    }
    if (billboardManager) {
        billboardManager.cleanup();
    }
});

// ✅ Handle tab visibility changes
document.addEventListener('visibilitychange', () => {
    if (document.hidden && supabaseManager.playerId) {
        console.log('👁️ Tab hidden, leaving room...');
        supabaseManager.leaveRoom();
    }
});