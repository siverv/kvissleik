import { Host } from "./views/Host3";
import { Make } from "./views/Make";
import { Play } from "./views/Play3";
import { Test } from "./views/Test";
import { Edit } from "./views/Edit";
import { View } from "./views/View";
import { NotFound } from "./views/NotFound";
import { Routes, Route } from "solid-app-router";
import {lazy} from 'solid-js';

// import { About } from "./views/About";
const About = lazy(() => import("./views/About").About);

export function AppRoutes(){
  return <Routes>
    <Route path="/play" element={<Play/>} />
    <Route path="/play/:code" element={<Play/>} />
    <Route path="/host" element={<Host/>} />
    <Route path="/host/:id" element={<Host/>} />
    <Route path="/make" element={<Make/>}/>
    <Route path="/edit/:id" element={<Edit/>}/>
    <Route path="/show/:id" element={<View/>}/>
    <Route path="/test" element={<Test/>} />
    <Route path="/about" element={<About/>} />
    <Route path="/" element={<Play/>} />
    <Route path="/*all" element={<NotFound />} />
  </Routes>;
}