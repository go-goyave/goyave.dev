<template>
  <div class="showcase" :class="background">
    <div class="showcase-desc">
      <div class="btnWrapper" >
        <button class="btn" @click="activeTab = i" v-for="(name, i) in tabs" :key="i" :class="{active: activeTab === i}">{{ name }}</button>
      </div>
      <div :class="{visibleDesc: activeTab === i}" class="description" v-for="(name, i) in tabs" :key="i">
        <slot :name="`slot-desc-${i}`"/>
      </div>
    </div>
    <div :class="{visibleCode: activeTab === i}" class="showcase-code" v-for="(name, i) in tabs" :key="i">
      <slot :name="`slot-code-${i}`" />
    </div>
  </div>
</template>

<script>
export default {
  name: 'showcase',
  props: {
	tabs: {
      type: Array,
      required: true,
    },
    background: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      activeTab: 0,
    }
  },
}
</script>

<style lang="stylus" scoped>
@import '../styles/variables.styl';

.description {
	display: none;
	padding: 0.75rem 0.75rem 0 0.75rem;
	overflow: scroll;
}

.btnWrapper {
	padding: 0.75rem 0.75rem 0 0.75rem;
}

.showcase {
	display: flex;
	position: relative;
  align-items: center;
	border-radius: 1.5rem;
	margin-bottom: 8rem;
	padding: 0.75rem;

	&:before {
		content: "";
		width: calc(100% - 50px);
		height: calc(100% - 50px);
		position: absolute;
		background: linear-gradient(45deg, $tipGreenBackground, white);
		border-radius: 1.5rem;
		top: 0;
		left: 0;
		z-index: 0;
	}

	.btn {
		height: auto;
		width: auto;
		border-radius: 1.5rem;
		border: none;
		font-size: 14px;
		padding: 12px;
		margin-right: 8px;
		color:#404040;
		background-color: #F2F2F2;
		font-family: 'Montserrat', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif;
		&.active {
			background-color:#39a171;
			color:#f3f3f3;
		}
	}

	&.bg-blue {
		flex-direction: row-reverse;
		
		&:before {
			background: linear-gradient(45deg, white, $mainBlueTheme);
			right: 0;
			left: auto;
		}

		.showcase-desc {
			margin-right: 0;
		}

		.showcase-code {
			margin-right: -30px;
			padding-right: 30px;

			div[class*="language-"] {
				padding-left: 0;
			}
		}

		.btn {
			&.active {
				background-color: $mainBlueTheme;
			}
		}
	}
}

.showcase-desc {
	height: 300px;
	display: flex;
	flex-direction: column;
	background-color: white;
	border-radius: 1.5rem;
	margin-right: -30px;
	overflow: hidden;
	width: 100%;
	scrollbar-width: thin;
	z-index: 2;
	flex: 1 0 0;
}

.showcase-code {
	display: none;
	height: 400px;
	border-radius: 1.5rem;
	background-color: #282c34;
	font-size: 13px;
	z-index: 1;
	flex: 1 0 0;
	overflow: hidden;
}

.visibleDesc {
	display: block;
}	

.visibleCode {
	display: flex;

}

.text {
	line-break: normal;
}

div[class*="language-"] {
  	display: flex;
		background-color: transparent;
  	width: 100%;
		overflow: hidden;
		padding-left: 30px;
	
	pre {
		margin-top: 0;
		margin-bottom: 0;
    width: 100%;
		scrollbar-width: thin;
	}
}


::-webkit-scrollbar {
	width: 11px;
	height: 11px;
}

::-webkit-scrollbar-button {
	width: 25px;
	height: 25px;
}

::-webkit-scrollbar-thumb {
	border-radius: 10px;
	-webkit-box-shadow: inset 0 0 6px rgba(0, 0, 0, .3);
	background-color: #555;
}

::-webkit-scrollbar-track {
	border-radius: 1.5rem;
}

::-webkit-scrollbar-corner {
	background-color: transparent;
}

.theme-dark {
	.showcase-desc {
	  background-color: #1a1a1a;
	}

	.showcase {
		&:before {
			background: linear-gradient(45deg, #1a1a1a , $tipGreenBackground);
		}

		.btn {
			color:#404040;
			background-color: #F2F2F2;
			&.active {
				background-color:$tipGreenBackground;
				color:#f3f3f3;
			}
		}

		&.bg-blue {
			flex-direction: row-reverse;
			&:before {
				background: linear-gradient(45deg, $mainBlueTheme, #1a1a1a );
			}

			.btn {
				&.active {
					background-color: $mainBlueTheme;
				}
			}
		}
	}
	
}

@media only screen and (max-width: $MQNarrow) {
	.showcase {
		margin-left: -1.5rem;
		margin-right: -1.5rem;
	}

	.showcase-desc {
		width:100%;
		height: 350px;
		margin:0;
		margin-bottom: 0.5rem;
		max-width: 100%;
		flex-basis: auto;
	}

	.showcase-code {
		margin:0;
		width:100%;
		max-width: 100%;
		flex-basis: auto;
		overflow:hidden;
		box-sizing: border-box;
		div[class*="language-"] {
			margin:0;
			padding-left:0;
		}
	}
	.showcase {
		flex-direction: column;
		padding:20px;
		.btn {
			width:100%;
			padding: 0.35rem;
			margin-bottom: 0.25rem;
		}

		&:before {
			width: 100%;
			background: linear-gradient(180deg,  $tipGreenBackground, white);
		}
		
		&.bg-blue {
			flex-direction: column !important;
			&:before {
				background: linear-gradient(180deg, $mainBlueTheme, white);
			}

			.showcase-desc {
				margin-right: 0px;
			}

			.showcase-code {
				margin-left: 0px;
				margin-right: 0px;
				padding-right: 0px;
			}
					
			.btn {
				background-color: #F2F2F2;
				&.active {
					background-color: $mainBlueTheme;
					color: #f3f3f3;
				}
			}

			div[class*="language-"] {
				padding-right: 0;
				pre {
					margin-right:0px;
				}
			}
		}
	}

	.theme-dark{
		.showcase { 
			&:before {
				background: linear-gradient(180deg, #1a1a1a,  $tipGreenBackground);
			}

			&.bg-blue {
				&:before {
					background: linear-gradient(180deg, #1a1a1a, $mainBlueTheme);
				}
			}
		}
	}
}
</style>
