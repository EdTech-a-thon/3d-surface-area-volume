<script lang="ts">
  import { t } from "$lib/i18n/index.svelte";

  let visible = $state(true);
</script>

{#if visible}
  <div class="rebrand-notice" data-testid="rebrand-notice">
    <p role="status">{t("rebrand.notice")}</p>
    <button
      type="button"
      aria-label={t("rebrand.dismiss")}
      title={t("rebrand.dismiss")}
      data-testid="dismiss-rebrand-notice"
      onclick={() => (visible = false)}
    >
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="m6 6 12 12M18 6 6 18" />
      </svg>
    </button>
  </div>
{/if}

<style>
  .rebrand-notice {
    position: fixed;
    top: 16px;
    left: 50%;
    z-index: 50;
    display: flex;
    width: max-content;
    max-width: calc(100vw - 32px);
    align-items: center;
    gap: 8px;
    padding: 5px 6px 5px 18px;
    border: 2px solid #e3b548;
    border-radius: 999px;
    color: var(--color-ink);
    background: #fff5d6f7;
    box-shadow: 0 10px 32px #10202b33;
    font-size: 15px;
    font-weight: 800;
    text-align: center;
    transform: translateX(-50%);
    animation: rebrand-notice 10.8s ease-in-out forwards;
  }

  p {
    margin: 0;
  }

  button {
    display: grid;
    width: 40px;
    height: 40px;
    flex: 0 0 40px;
    place-items: center;
    padding: 0;
    border: 0;
    border-radius: 999px;
    color: inherit;
    background: transparent;
    cursor: pointer;
  }

  button:hover {
    background: #10202b14;
  }

  svg {
    width: 19px;
    height: 19px;
    fill: none;
    stroke: currentColor;
    stroke-linecap: round;
    stroke-width: 2;
  }

  @keyframes rebrand-notice {
    0% {
      opacity: 0;
      transform: translate(-50%, -8px);
    }
    3%,
    92.5% {
      opacity: 1;
      transform: translate(-50%, 0);
    }
    100% {
      visibility: hidden;
      opacity: 0;
      transform: translate(-50%, -4px);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .rebrand-notice {
      animation-name: rebrand-notice-reduced;
    }

    @keyframes rebrand-notice-reduced {
      0%,
      92.5% {
        opacity: 1;
        transform: translate(-50%, 0);
      }
      100% {
        visibility: hidden;
        opacity: 0;
        transform: translate(-50%, 0);
      }
    }
  }
</style>
