<script lang="ts">
import { page } from "$app/stores";
import { io } from "socket.io-client";
import type { Action, Viewpoint } from "$lib/types";

const url = $page.url.pathname;
const socket = new io(url);

let connected = false;
let gamestate = {};

socket.on('connect', () => {
  connected = true;
});

socket.on('disconnect', () => {
  connected = false;
});

socket.on('gamestate', (newGamestate: Viewpoint) => {
  gamestate = newGamestate;
});

function actionCallback(action: Action) {
  socket.emit('action', action);
  // do client-side updating if you want
}
</script>

{#if connected}
<p>welcome to game {url.slice(6)}</p>
<p>gamestate: {JSON.stringify(gamestate)}</p>
{:else}
<p>connecting...</p>
{/if}