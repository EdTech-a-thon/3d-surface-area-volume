<script lang="ts">
  import { t } from "$lib/i18n/index.svelte";
</script>

<p class="rebrand-notice" role="status" data-testid="rebrand-notice">
  {t("rebrand.notice")}
</p>

<style>
  .rebrand-notice {
    position: fixed;
    top: 16px;
    left: 50%;
    z-index: 50;
    width: max-content;
    max-width: calc(100vw - 32px);
    margin: 0;
    padding: 11px 18px;
    border: 2px solid #e3b548;
    border-radius: 999px;
    color: var(--color-ink);
    background: #fff5d6f7;
    box-shadow: 0 10px 32px #10202b33;
    font-size: 15px;
    font-weight: 800;
    text-align: center;
    pointer-events: none;
    transform: translateX(-50%);
    animation: rebrand-notice 10.8s ease-in-out forwards;
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
