<script>
  export let title;
  export let open = false;

  function toggle() {
    open = !open;
  }
</script>

<div class="control-section">
  <button type="button" class="section-toggle" on:click={toggle}>
    <span class="param-group-title">{title}</span>
    <span class="section-arrow">{open ? '▴' : '▾'}</span>
  </button>
  {#if open}
    <div class="section-content">
      <slot />
    </div>
  {/if}
</div>

<style>
  .section-toggle {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    background: none;
    border: none;
    padding: 0;
    cursor: pointer;
  }

  .section-arrow {
    font-size: 24px;
    color: #555;
  }

  .section-content {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-top: 0;
  }
</style>
