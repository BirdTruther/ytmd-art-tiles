import streamDeck from "@elgato/streamdeck";
import { ArtTile } from "./actions/art-tile";
import { YtmdClient } from "./ytmd";

const ytmd = new YtmdClient();
streamDeck.actions.registerAction(new ArtTile(ytmd));
await streamDeck.connect();
await ytmd.start();
