<script lang="ts">
  import { createForm } from "svelte-forms-lib";
  import { goto } from "$app/navigation";

  const { form, handleChange, handleSubmit } = createForm({
    initialValues: {
      roomCode: ""
    },
    onSubmit: async (values) => {
      goto(`/game/${values.roomCode}`);
    }
  });
</script>

<h2>Join Game</h2>
<form on:submit={handleSubmit}>
  <label>Join room from code:
    <input
      id="roomCode"
      type="text"
      on:change={handleChange}
      bind:value={$form.roomCode}>
  </label>
  <button type="submit">Join</button>
</form>