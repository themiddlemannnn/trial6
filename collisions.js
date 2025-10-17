const BALL_RADIUS = 1.2;
const COLLISION_DIAMETER = BALL_RADIUS * 2;
const MIN_SEPARATION = 0.01;

/**
 * Handles collision detection and response for all balls in the scene.
 * @param {Player} player The main player object.
 * @param {Array<Object>} remotePlayerObjects An array of remote player objects.
 */
export function handleCollisions(player, remotePlayerObjects) {
    if (!player || !player.ball) return;

    // ✅ Only check player collision with remote players (not remote vs remote)
    remotePlayerObjects.forEach(remoteBall => {
        if (!remoteBall || !remoteBall.ball) return;

        const posA = player.ball.position;
        const posB = remoteBall.ball.position;

        const dx = posB.x - posA.x;
        const dz = posB.z - posA.z;
        const distanceSqXZ = dx * dx + dz * dz;

        // --- Vertical Collision (Standing on Head) ---
        if (player.isJumping && player.jumpVelocity <= 0) {
            // Check if the player is positioned above the other ball
            if (posA.y > posB.y && distanceSqXZ < COLLISION_DIAMETER * COLLISION_DIAMETER) {
                const verticalDist = posA.y - posB.y;
                if (verticalDist < COLLISION_DIAMETER && verticalDist > 0) {
                    posA.y = posB.y + COLLISION_DIAMETER - MIN_SEPARATION;
                    player.isJumping = false;
                    player.jumpVelocity = 0;
                    return; // Skip horizontal collision this frame
                }
            }
        }

        // --- Horizontal Collision (XZ Plane) ---
        if (distanceSqXZ < COLLISION_DIAMETER * COLLISION_DIAMETER && distanceSqXZ > 0.01) {
            const distanceXZ = Math.sqrt(distanceSqXZ);
            const overlap = COLLISION_DIAMETER - distanceXZ;
            
            // ✅ Only push the local player (don't modify remote player position)
            const pushX = (dx / distanceXZ) * overlap;
            const pushZ = (dz / distanceXZ) * overlap;
            
            // Push local player away from remote player
            posA.x -= pushX;
            posA.z -= pushZ;

            // ✅ Bounce effect - only affect local player velocity
            if (player.velocity) {
                const normal = new THREE.Vector2(dx, dz).normalize();
                const vPlayer = new THREE.Vector2(player.velocity.x, player.velocity.z);
                
                const speed = vPlayer.dot(normal);

                if (speed < 0) {
                    // Reflect velocity away from collision
                    const reflection = normal.multiplyScalar(speed * 1.5); // 1.5 for bounce effect
                    player.velocity.x -= reflection.x;
                    player.velocity.z -= reflection.y;
                }
            }
        }
    });
}