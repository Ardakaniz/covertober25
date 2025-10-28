const width = 128, height = 128, sample_count = 66; // match Python
const CURRENT_JOUR = 27;
const MAX_SIMULTANEOUS_SAMPLE = 8;
const JOUR_LABELS = [
	"digital playground",
	"Calin",
	"blue lightning",
	"SUNKISSED",
	"azerty vitamin",
	"UnisOn",
	"NeonBloodRace",
	"ALL star",
	"Pommefreche",
	"Xoxo Baby Velour",
	"lunes furiosoooOO",
	"Purple Ash",
	"うずまき ⁠๑",
	"Aurore",
	"ENOCHIAN",
	"one percent",
	"Kernel panic",
	"DCIM",
	"six nine kelvin",
	"Baby steps",
	"sang brulure sel",
	"angel edge",
	"dress to depress",
	"today is for me",
	"Chii elixir",
	"threesix gambling sq",
	"RERERE",
	"где Надежда",
	"DSM said ; ASD cues",
	"crackheart",
	"i still love u"
]
let ANIM_FPS = 15;

let colormaps = ["Dark2","YlGnBu","RdPu","Pastel2","hot","Spectral","magma","twilight_shifted","hsv","Purples","Purples_r","Greens","Blues","Blues_r","Greys","cividis","copper","viridis","winter","summer"];
let jour_configs;
let jours = [];
let anim_frame = 0;
let started = false;
let playing_idxs = [];
let KERNEL_PANIC = 0;

function setup_dom() {
	const grid = document.querySelector(".grid-container");
	for (let i = 0; i < JOUR_LABELS.length; i++) {
		const node = document.createElement("div")
		node.id = `J${i+1}`;
		node.classList.add("grid-item");

		const label = document.createElement("span");
		label.classList.add("label");
		label.innerText = JOUR_LABELS[i];
		node.appendChild(label);

		const preview = document.createElement("img");
		preview.classList.add("preview");
		if (i+1 > CURRENT_JOUR) {
			preview.src = "appIcon.png";
			preview.style.opacity = "20%";
		}
		else preview.src = `covers/J${i+1}.png`;
		preview.style.display = "block";
		node.appendChild(preview);

		const cnv = document.createElement("canvas");
		cnv.style.display = "none";
		node.appendChild(cnv);

		grid.appendChild(node);
	}

	fetch("covers/configs.json")
		.then(response => response.json())
		.then(confs => {
			jour_configs = confs;
			for (let i = 1; i < JOUR_LABELS.length + 1; i++) {
				if ("pixelated" in jour_configs[i] && jour_configs[i]["pixelated"])
					document.getElementById(`J${i}`).classList.add("pixelated");
			}
		})
		.then(setup)
		.then(_ => {
			const play_el = document.getElementById("play");
			play_el.innerText = "play";
			play_el.classList.remove("disabled");
			animate();

			const play_cb = () => {
				jours[0].audio[0].play();

				started = true;

				if ("mediaSession" in navigator) 
					navigator.mediaSession.playbackState = "playing";

				for (let i = 1; i < CURRENT_JOUR + 1; i++) {
					document.getElementById(`J${i}`).classList.add("activable");
				}

				play_el.removeEventListener("click", play_cb)
			}
			play_el.addEventListener("click", play_cb);

			if ("mediaSession" in navigator) {
				navigator.mediaSession.metadata = new MediaMetadata({
					title: " - ",
					artist: "Irrational",
					album: "Coverartober 2025",
					artwork: [{"src": "appIcon.png", sizes: "128x128", type:"images/png"}]
				});

				navigator.mediaSession.setActionHandler("play", () => {
					navigator.mediaSession.playbackState = "playing";

					jours[0].audio[0].play();
					playing_idxs.forEach(x => {
						jours[0].audio[x].play();
						jours[x].audio.play();
					});
				});
				navigator.mediaSession.setActionHandler("pause", () => {
					navigator.mediaSession.playbackState = "paused";

					jours[0].audio[0].pause();
					playing_idxs.forEach(x => {
						jours[0].audio[x].pause();
						jours[x].audio.pause();
					});
				});
			}
		});
}

async function setup_jour(jour_idx) {
	const jour_name = `J${jour_idx}`;

	let cnv = document.querySelector("#" + jour_name + ">canvas");
	cnv.width = width;
	cnv.height = height;

	let audio = null;
	if (!("no_audio" in jour_configs[jour_idx]) || !jour_configs[jour_idx]["no_audio"]) {
		audio = new Audio(`samples/${jour_name}.mp3`);
		audio.loop = true;
		audio.volume = 0;
	}

	let audio_start = null;
	if ("has_start" in jour_configs[jour_idx] && jour_configs[jour_idx]["has_start"]) {
		audio_start = new Audio(`samples/${jour_name}_start.mp3`);
		audio_start.addEventListener("ended", () => {
			jours[jour_idx].audio.play();
			jours[jour_idx].target_volume = 1;

			if (jour_idx === 17) {
				KERNEL_PANIC = 0;
				ANIM_FPS = 20;
				jours[17].audio.volume = 0;
				jours[17].target_volume = 1;

				for (let i = 1; i <= CURRENT_JOUR; i++) {
					const classes = document.getElementById(`J${i}`).classList;
					if (classes.contains("activated")) {
						jours[i].target_volume = 1;
						jours[i].audio.play();
					}
					else classes.add("activable");
				}

			}
		});
	}

	const ctx = cnv.getContext("2d");

	jours[jour_idx].ctx = ctx;
	jours[jour_idx].audio = audio;

	await fetch(`covers/${jour_name}.bin`)
		.then(response => response.arrayBuffer())
		.then(buffer => {
			const data = new Uint8Array(buffer);
			let idx = 0;
			let px_data = jours[jour_idx].px_data;
			const single_img = "single_img" in jour_configs[jour_idx]; 

			for(let x = 0; x < width; x++) {
				px_data.push([]);
				for(let y = 0; y < height; y++) {
					px_data[x].push([]);
					for(let f = 0; f < sample_count; f++) {
						let px = data[idx];

						if (!single_img) idx++;

						if (jour_configs[jour_idx].force_cycle) {
							if (px >= 128) {
								px = 2*(256 - px)-1;
							}
							else {
								px = 2*px;
							}
						}

						px_data[x][y].push(px);
					}

					if (single_img) idx++;
				}
			}

			cache_image_data(jour_idx);
			draw_frame(jour_idx, jour_configs[jour_idx].base_frame);

			document.querySelector("#" + jour_name + ">img").style.display = "none";
			cnv.style.display = "block";

			const play_btn = document.querySelector("#" + jour_name + ">span");
			const click_cb = () => {
				if (started && KERNEL_PANIC == 0) {
					if (playing_idxs.length === 0)
						anim_frame = 0;

					const playing_idxs_with_audio = playing_idxs.filter(i => jours[i].audio !== null);
					if (playing_idxs_with_audio.length === MAX_SIMULTANEOUS_SAMPLE) {
						const removed = playing_idxs_with_audio[0];
						jours[removed].target_volume = 0;
						playing_idxs.splice(playing_idxs.indexOf(removed), 1);
					}

					playing_idxs.push(jour_idx);

					jours[0].target_volume = 0.8*Math.pow(1.0/playing_idxs.length, 1/2.5);
					jours[0].audio[jour_idx].play();

					if (audio_start !== null) audio_start.play();
					else if (audio !== null) {
						audio.play();
						jours[jour_idx].target_volume = 1;
					}

					if (jour_idx === 17) {
						KERNEL_PANIC = 1;

						setTimeout(() => {
							KERNEL_PANIC = 2;
						}, 16690);
						setTimeout(() => { ANIM_FPS = 75; }, 39705);

						for (let i = 1; i <= CURRENT_JOUR; i++) {
							jours[i].target_volume = 0;
							const elem = document.getElementById(`J${i}`);
							elem.getElementsByTagName("img")[0].style.display = "none";
							elem.getElementsByTagName("canvas")[0].style.display = "block";
							elem.classList.remove("activable");
						}

						jours[0].target_volume = 0;
					}

					if ("mediaSession" in navigator) {
						const mdata = navigator.mediaSession.metadata;
						navigator.mediaSession.metadata = new MediaMetadata({
							title: parseInt(playing_idxs.join("")).toString(16),
							album: mdata.album,
							artist: mdata.artist,
							artwork: [{"src": `covers/${jour_name}.png`, sizes: "128x128", type:"images/png"}]
						});
					}

					cnv.parentNode.classList.remove("activable")
					cnv.parentNode.classList.add("activated")
					cnv.removeEventListener("click", click_cb);
					play_btn.removeEventListener("click", click_cb);
				}
			};
			cnv.addEventListener("click", click_cb);
			play_btn.addEventListener("click", click_cb);
		})
		.catch(e => {});
}

async function setup() {
	colormaps = Object.fromEntries(
		await Promise.all(
			colormaps.map(async (x) => [
				x,
				await fetch(`colormaps/${x}.json`).then((r) => r.json())
			])
		)
	);

	//// SETUP J0 ////
	jours.push({
		ctx: null,
		px_data: [],
		audio: [],
		target_volume: 0.8
	});

	for (let i = 1; i <= CURRENT_JOUR; i++) {
		jours.push({
			ctx: null,
			img_data_cache: [],
			px_data: [],
			audio: null,
			target_volume: 0.,
		});

		document.getElementById(`J${i}`).classList.add("enabled");
	}

	const J0_promise = fetch("samples/J0.mp3")
		.then(response => response.blob())
		.then(URL.createObjectURL)
		.then(audio_bloburl => {
			for (let i = 0; i <= CURRENT_JOUR; i++) {
				let cur_audio = new Audio(audio_bloburl);
				cur_audio.loop = true;
				cur_audio.volume = 0.8;
				jours[0].audio.push(cur_audio);
			}
		});
	//// END SETUP J0 ////

	//// SETUP rest ////
	await setup_jour(17); // J17 must be setup before others

	let Jrest_promises = [];
	for (let jour_idx = 1; jour_idx <= CURRENT_JOUR; jour_idx++) {
		if (jour_idx == 17)
			continue;

		Jrest_promises.push(setup_jour(jour_idx));
	}
	//// END SETUP rest ////

	await Promise.all([J0_promise, ...Jrest_promises]);
}

function cache_image_data(jour_idx) {
	const jour = jours[jour_idx];
	jour.img_data_cache = [];

	for (let frame_idx = 0; frame_idx < sample_count; frame_idx++) {
		let img_data = jour.ctx.createImageData(width, height);
		let img_data_panic = jour.ctx.createImageData(width, height);
		
		for (let y = 0; y < height; y++) {
			for (let x = 0; x < width; x++) {
				const px = jour.px_data[y][x][frame_idx];
				const px_panic = jours[17].px_data[y][x][frame_idx];
				const index = (y*width + x)*4;
	
				const cm = colormaps[jour_configs[jour_idx].cm];

				const [r,g,b] = cm[px];
				img_data.data[index+0] = r;
				img_data.data[index+1] = g;
				img_data.data[index+2] = b;
				img_data.data[index+3] = 255;

				const [r_,g_,b_] = cm[px_panic];
				img_data_panic.data[index+0] = r_;
				img_data_panic.data[index+1] = g_;
				img_data_panic.data[index+2] = b_;
				img_data_panic.data[index+3] = 255;
			}
		}

		jour.img_data_cache.push([img_data, img_data_panic]);
	}
}

function draw_frame(jour_idx, frame_idx) {
	const jour = jours[jour_idx];
	const frame = KERNEL_PANIC == 2 ? jour.img_data_cache[frame_idx][1] : jour.img_data_cache[frame_idx][0];
	jour.ctx.putImageData(frame, 0, 0);
}

function animate() {
	let img_idx = (anim_frame >= sample_count) ? 2 * sample_count - 2 - anim_frame : anim_frame;

	if (KERNEL_PANIC == 2) {
		for (let i = 1; i <= CURRENT_JOUR; i++)
			draw_frame(i, img_idx);
	}
	else playing_idxs.forEach(x => draw_frame(x, img_idx));
	
	//// AUDIO FADING ////
	for (let i = 0; i < CURRENT_JOUR + 1; i++) {
		const j_audio = jours[i].audio;

		if (j_audio === null)
			continue;

		const tar_vol = jours[i].target_volume;
		const cur_vol = i == 0 ? jours[i].audio[0].volume : jours[i].audio.volume;

		const delta_vol = (tar_vol - cur_vol) * 0.05 * 15/ANIM_FPS;

		if (i == 0) j_audio.forEach(audio => audio.volume += delta_vol);
		else j_audio.volume += delta_vol;

		if (i != 0 && tar_vol == 0 && cur_vol < 0.1)
			j_audio.pause();
	}
	//// ////

	anim_frame = (anim_frame + 1) % (2*sample_count - 2);
	setTimeout(() => animate(), 1/ANIM_FPS*1000);
}

setup_dom();