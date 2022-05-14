
# Kvissleik


A p2p single-host multi-client application inspired by the Jackbox games. 

Demo at [kvissleik.no](https://kvissleik.no)

Source-code should be available at [git.kvissleik.no](https://git.kvissleik.no)

![Playthrough of the default quiz with 3 participants](kvissleik-v0.0.2.gif)

## Usage

At the moment, playing games of Kvissleik requires the use of the [Samspill signalling server](https://git.kvissleik.no/samspill/).


## Install
```
npm ci --ignore-scripts
```

## Development
```
npm start
```

## Production
```
npm run build
npm run serve
```

## Name

In short: Pronounced "quiz-like"

The name is a Norwegian almost-word essentially meaning quiz-as-adjective-converted-to-noun (Quizzyness), but can also be intepreted as "quiz" + "playing around" (Quizplay). Among less literal interpretations, it sounds a bit like new-norwegian question-words like "kvifor" (Why) and "korleis" (How), and it evokes the feelings of the most common "-leik"-suffixed word: "kjærleik" (Love)

It is a nice sounding name with a lot of layers and a neat close-enough pronounciation in English as "Quiz-like", and according to internet searches it is not a real word, which makes it perfect for a name!

## Licensing

	Kvissleik
	Copyright (C) 2022 Siver K. Volle
	
	This program is free software: you can redistribute it and/or modify
	it under the terms of the GNU General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.
	
	This program is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU General Public License for more details.
	
	You should have received a copy of the GNU General Public License
	along with this program.  If not, see <https://www.gnu.org/licenses/>.


## Credits

* Reactive web framework through [SolidJS](https://www.solidjs.com/)
* WebRTC through [SimplePeer](https://github.com/feross/simple-peer)
* Build and PWA with [Vite](https://github.com/vitejs/vite)
* Linted with [ESLint](https://eslint.org/)
* Programmed mostly with [Sublime Text](https://www.sublimetext.com/)
* Font is [Fira Sans](https://mozilla.github.io/Fira/) by Mozilla
* Inspired by the wonderful [Jackbox games](https://www.jackboxgames.com/)