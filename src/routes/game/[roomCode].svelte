<script lang="ts">
import { page } from "$app/stores";
import { io } from "socket.io-client";

const url = $page.url.pathname;
const socket = new io(url);

socket.on('connect', () => {
  // idk
});

socket.on('gamestate', (gs) => {
  alert(JSON.stringify(gs));
});
</script>

<p>welcome to game {url.slice(6)}</p>