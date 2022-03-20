<script lang="ts">
import { page } from "$app/stores";
const roomCode = $page.url.pathname.slice(6);
</script>

<p>welcome to game {roomCode}</p>