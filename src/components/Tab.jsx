import { batch, createSignal, Match } from "solid-js";

export function useTabSystem(searchParamField, defaultTab){
  const searchParams = new URLSearchParams(location.search);
  const initialTab = (searchParamField && searchParams.get(searchParamField)) || defaultTab;
  const [activeTab, setActiveTab] = createSignal(initialTab);
  function changeTab(tab){
    let searchParams = new URLSearchParams(location.search);
    searchParams.set(searchParamField, tab);
    window.history.replaceState(null, null, "?" + searchParams.toString() + location.hash);
    batch(() => {
      setActiveTab(tab);
    });
  }
  return [
    activeTab,
    changeTab
  ];
}

export function TabButton({tab, tabSignal: [activeTab, changeTab], children}){
  return <button class="tab-button"
    data-active={activeTab() === tab || undefined}
    data-tab={tab}
    onClick={() => changeTab(tab)}
  >
    {children}
  </button>;
}


export function TabPanel({tab, tabSignal: [activeTab], children}){
  return <Match when={activeTab() === tab}>
    {children}
  </Match>;
}
