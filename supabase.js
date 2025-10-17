import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';
import { getConfig } from './config.js';

const SUPABASE_URL = getConfig('SUPABASE.URL');
const SUPABASE_ANON_KEY = getConfig('SUPABASE.ANON_KEY');
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const MAX_PLAYERS_PER_ROOM = getConfig('ROOM.MAX_PLAYERS', 25);
const ROOM_RESET_HOURS = getConfig('ROOM.RESET_HOURS', 12);

export class SupabaseManager {
    constructor() {
        this.currentRoom = null;
        this.playerId = null;
        this.playerName = null;
        this.playerSubscription = null;
        this.billboardSubscription = null;
        this.chatSubscription = null;
        this.heartbeatInterval = null;
        this.isLeaving = false; // ✅ Prevent duplicate cleanup
    }

    generatePlayerId() {
        return `player_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    async findAvailableRoom() {
        try {
            const { data: rooms, error } = await supabase
                .from('rooms')
                .select('id, player_count, created_at')
                .lt('player_count', MAX_PLAYERS_PER_ROOM)
                .order('created_at', { ascending: true })
                .limit(1);
            
            if (error) throw error;
            
            if (rooms && rooms.length > 0) {
                const room = rooms[0];
                const roomAge = Date.now() - new Date(room.created_at).getTime();
                const hoursOld = roomAge / (1000 * 60 * 60);
                if (hoursOld >= ROOM_RESET_HOURS) {
                    await this.resetRoom(room.id);
                }
                return room.id;
            }
            
            const { data: newRoom, error: createError } = await supabase
                .from('rooms')
                .insert([{ player_count: 0, created_at: new Date().toISOString() }])
                .select()
                .single();
            
            if (createError) throw createError;
            return newRoom.id;
        } catch (error) {
            console.error('Error finding room:', error);
            return null;
        }
    }

    async joinRoom(roomId, playerName, ballColor, countryCode) {
        try {
            this.playerId = this.generatePlayerId();
            this.playerName = playerName;
            this.currentRoom = roomId;
            this.isLeaving = false;

            const { error } = await supabase
                .from('players')
                .insert([{
                    id: this.playerId,
                    room_id: roomId,
                    name: playerName,
                    ball_color: ballColor,
                    country_code: countryCode,
                    position_x: 0,
                    position_y: 1.2,
                    position_z: 25,
                    last_active: new Date().toISOString()
                }]);
            
            if (error) throw error;

            await supabase.rpc('increment_room_players', { room_id: roomId });

            // ✅ Wait for subscriptions to be ready before continuing
            await this.subscribeToPlayers();
            await this.subscribeToMainBillboard();
            await this.subscribeToChatMessages();
            this.startHeartbeat();

            return this.playerId;
        } catch (error) {
            console.error('Error joining room:', error);
            return null;
        }
    }

    async subscribeToPlayers() {
        return new Promise((resolve) => {
            if (this.playerSubscription) {
                supabase.removeChannel(this.playerSubscription);
            }
            
            const channelName = `room-players-${this.currentRoom}-${Date.now()}`;
            this.playerSubscription = supabase
                .channel(channelName)
                .on('postgres_changes', 
                    { 
                        event: '*', 
                        schema: 'public', 
                        table: 'players',
                        filter: `room_id=eq.${this.currentRoom}`
                    }, 
                    (payload) => {
                        this.handlePlayerUpdate(payload);
                    }
                )
                .subscribe((status) => {
                    if (status === 'SUBSCRIBED') {
                        console.log('✅ Subscribed to players');
                        resolve();
                    }
                });
        });
    }

    async subscribeToMainBillboard() {
        return new Promise((resolve) => {
            if (this.billboardSubscription) {
                supabase.removeChannel(this.billboardSubscription);
            }
            
            const channelName = `room-billboard-${this.currentRoom}-${Date.now()}`;
            this.billboardSubscription = supabase
                .channel(channelName)
                .on('postgres_changes',
                    {
                        event: '*',
                        schema: 'public',
                        table: 'main_billboard',
                        filter: `room_id=eq.${this.currentRoom}`
                    },
                    (payload) => {
                        this.handleBillboardUpdate(payload);
                    }
                )
                .subscribe((status) => {
                    if (status === 'SUBSCRIBED') {
                        console.log('✅ Subscribed to billboard');
                        resolve();
                    }
                });
        });
    }

    async subscribeToChatMessages() {
        return new Promise((resolve) => {
            if (this.chatSubscription) {
                supabase.removeChannel(this.chatSubscription);
            }
            
            const channelName = `room-chat-${this.currentRoom}-${Date.now()}`;
            console.log('📡 Subscribing to chat channel:', channelName);
            
            this.chatSubscription = supabase
                .channel(channelName)
                .on('postgres_changes',
                    {
                        event: 'INSERT',
                        schema: 'public',
                        table: 'chat_messages',
                        filter: `room_id=eq.${this.currentRoom}`
                    },
                    (payload) => {
                        console.log('📨 Raw chat payload received:', payload);
                        this.handleChatMessage(payload);
                    }
                )
                .subscribe((status) => {
                    console.log('📡 Chat subscription status:', status);
                    if (status === 'SUBSCRIBED') {
                        console.log('✅ Subscribed to chat');
                        resolve();
                    }
                });
        });
    }

    handlePlayerUpdate(payload) {
        const event = payload.eventType;
        const player = payload.new || payload.old;
        
        // ✅ Ignore updates for current player
        if (player.id === this.playerId) return;
        
        window.dispatchEvent(new CustomEvent('playerUpdate', {
            detail: { event, player }
        }));
    }

    handleBillboardUpdate(payload) {
        const billboard = payload.new;
        window.dispatchEvent(new CustomEvent('billboardUpdate', {
            detail: { billboard }
        }));
    }

    handleChatMessage(payload) {
        const chatMessage = payload.new;
        console.log('💬 handleChatMessage called with:', chatMessage);
        console.log('💬 Current player ID:', this.playerId);
        console.log('💬 Message player ID:', chatMessage.player_id);
        console.log('💬 Dispatching chatMessage event...');
        
        window.dispatchEvent(new CustomEvent('chatMessage', {
            detail: { chatMessage }
        }));
        
        console.log('💬 chatMessage event dispatched');
    }

    async updatePlayerPosition(x, y, z) {
        if (!this.playerId || !this.currentRoom || this.isLeaving) return;
        
        // ✅ Throttle updates - don't send if nothing changed significantly
        const roundedX = Math.round(x * 100) / 100;
        const roundedY = Math.round(y * 100) / 100;
        const roundedZ = Math.round(z * 100) / 100;
        
        supabase
            .from('players')
            .update({
                position_x: roundedX,
                position_y: roundedY,
                position_z: roundedZ,
                last_active: new Date().toISOString()
            })
            .eq('id', this.playerId)
            .then(() => {})
            .catch(err => {
                if (!this.isLeaving) {
                    console.error('Position update error:', err);
                }
            });
    }

    async sendChatMessage(message) {
        if (!this.currentRoom || !this.playerId || !this.playerName) {
            console.error('❌ Cannot send message - missing:', {
                room: this.currentRoom,
                playerId: this.playerId,
                playerName: this.playerName
            });
            return;
        }
        
        console.log('📤 Sending chat message:', {
            room_id: this.currentRoom,
            player_id: this.playerId,
            player_name: this.playerName,
            message: message
        });
        
        try {
            const { data, error } = await supabase
                .from('chat_messages')
                .insert([{
                    room_id: this.currentRoom,
                    player_id: this.playerId,
                    player_name: this.playerName,
                    message: message,
                    created_at: new Date().toISOString()
                }])
                .select();
            
            if (error) {
                console.error('❌ Chat insert error:', error);
                throw error;
            }
            
            console.log('✅ Chat message sent successfully:', data);
        } catch (error) {
            console.error('❌ Error sending message:', error);
            console.error('Error details:', {
                message: error.message,
                details: error.details,
                hint: error.hint,
                code: error.code
            });
        }
    }

    async getActivePlayers() {
        try {
            const { data, error } = await supabase
                .from('players')
                .select('*')
                .eq('room_id', this.currentRoom)
                .gte('last_active', new Date(Date.now() - 60000).toISOString());
            
            if (error) throw error;
            return data || [];
        } catch (error) {
            console.error('Error getting players:', error);
            return [];
        }
    }

    startHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }
        
        this.heartbeatInterval = setInterval(async () => {
            if (!this.playerId || this.isLeaving) return;
            
            try {
                await supabase
                    .from('players')
                    .update({ last_active: new Date().toISOString() })
                    .eq('id', this.playerId);
            } catch (error) {
                if (!this.isLeaving) {
                    console.error('Heartbeat error:', error);
                }
            }
        }, 15000);
    }

    async leaveRoom() {
        if (this.isLeaving) {
            console.log('Already leaving, skipping...');
            return;
        }
        
        this.isLeaving = true;
        console.log('🚪 Leaving room...');
        
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
        
        if (this.playerId && this.currentRoom) {
            try {
                // ✅ Unsubscribe first to prevent duplicate events
                await this.unsubscribeAll();
                
                // ✅ Then delete player
                await supabase.from('players').delete().eq('id', this.playerId);
                await supabase.rpc('decrement_room_players', { room_id: this.currentRoom });
                
                console.log('✅ Successfully left room');
            } catch (error) {
                console.error('Error leaving room:', error);
            }
        }
        
        this.playerId = null;
        this.currentRoom = null;
        this.playerName = null;
    }

    async unsubscribeAll() {
        const promises = [];
        
        if (this.playerSubscription) {
            promises.push(supabase.removeChannel(this.playerSubscription));
            this.playerSubscription = null;
        }
        if (this.billboardSubscription) {
            promises.push(supabase.removeChannel(this.billboardSubscription));
            this.billboardSubscription = null;
        }
        if (this.chatSubscription) {
            promises.push(supabase.removeChannel(this.chatSubscription));
            this.chatSubscription = null;
        }
        
        await Promise.all(promises);
        console.log('✅ Unsubscribed from all channels');
    }

    async resetRoom(roomId) {
        try {
            await supabase.from('players').delete().eq('room_id', roomId);
            await supabase.from('main_billboard').delete().eq('room_id', roomId);
            await supabase.from('wall_billboards').delete().eq('room_id', roomId);
            await supabase.from('chat_messages').delete().eq('room_id', roomId);
            await supabase.from('rooms').update({
                player_count: 0,
                created_at: new Date().toISOString()
            }).eq('id', roomId);
        } catch (error) {
            console.error('Error resetting room:', error);
        }
    }

    async getMainBillboard() {
        if (!this.currentRoom) return null;
        
        try {
            const { data, error } = await supabase
                .from('main_billboard')
                .select('*')
                .eq('room_id', this.currentRoom)
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();
            
            if (error && error.code !== 'PGRST116') throw error;
            return data;
        } catch (error) {
            console.error('Error getting billboard:', error);
            return null;
        }
    }

    async uploadBillboard(file, amount, contentType) {
        try {
            const fileName = `${this.currentRoom}/${Date.now()}_${file.name}`;
            const { error: uploadError } = await supabase.storage
                .from('billboard-content')
                .upload(fileName, file);
            
            if (uploadError) throw uploadError;
            
            const { data: urlData } = supabase.storage
                .from('billboard-content')
                .getPublicUrl(fileName);
            
            const { error: insertError } = await supabase
                .from('main_billboard')
                .insert([{
                    room_id: this.currentRoom,
                    player_id: this.playerId,
                    player_name: this.playerName,
                    content_url: urlData.publicUrl,
                    content_type: contentType,
                    amount_paid: amount,
                    created_at: new Date().toISOString()
                }]);
            
            if (insertError) throw insertError;
            return urlData.publicUrl;
        } catch (error) {
            console.error('Error uploading billboard:', error);
            return null;
        }
    }
}

export const supabaseManager = new SupabaseManager();