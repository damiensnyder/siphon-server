<script lang="ts">
import { page } from "$app/stores";
import { io } from "socket.io-client";
import type { Action, Viewpoint } from "$lib/types";

const absoluteUrl = $page.url.toString();
const relativeUrl = $page.url.pathname;
const socket = new io(relativeUrl);

let connected = false;
let gamestate: Viewpoint | null = null;
let inviteLinkText;

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

function copyInviteLink() {
  inviteLinkText.select();
  document.execCommand("copy");
  inviteLinkText.setSelectionRange(0, 0);
}
</script>

{#if connected && gamestate != null}
<h1>{gamestate.roomName}</h1>
<p>Invite a friend:</p>
<input
  value={absoluteUrl}
  bind:this={inviteLinkText}
  readonly />
<button on:click={copyInviteLink}>Copy</button>
<p>gamestate: {JSON.stringify(gamestate)}</p>
{:else}
<p>connecting...</p>
{/if}